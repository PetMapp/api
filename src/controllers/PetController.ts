import express from "express";
import FirebaseService from "../services/FirebaseService";
import pet from "../models/entities/pet";
import RegisterFindPetDTO_Req from "../DTOs/request/RegisterFindPetDTO_Req";
import authorize from "../middleware/authorize";
import GoogleService from "../services/GoogleService";
import petLocation from "../models/entities/petLocation";
import { PetFindEditDTO_Req } from "../DTOs/request/PetFindEditDTO_Req";
import PetFindDeleteDTO_Res from "../DTOs/request/PetFindDeleteDTO_Res";
import DetailFindPetDTO_Res from "../DTOs/response/DetailFindPetDTO_Res";
import multer from 'multer';
import { admin } from "../firebase";
import petLocationDTO_Res from "../DTOs/response/PetLocationDTO_Res";
import LocateByLatLngDTO_Req from "../DTOs/request/LocateByLatLngDTO_Req";
const router = express.Router();

var fireservice = new FirebaseService();
var googleService = new GoogleService();

var storage = multer.memoryStorage();
var upload = multer({ storage });

// router.get("/location/all", authorize, async (req, res) => {
//     var list: petLocation[] = await fireservice.list<petLocation>("petLocations");
//     var bucket = admin.storage().bucket();

//     const locatePromises = list.map(async (i) => {
//         var file = bucket.file(`pets/${i.petId}/thumb`);
//         var image = await file.getSignedUrl({
//             expires: Date.now() + 60 * 60 * 1000,
//             action: "read",
//             version: "v4"
//         });

//         return {
//             lat: i.lat,
//             lng: i.lng,
//             petId: i.petId,
//             petImage: image[0] ?? ""
//         };
//     })

//     var locate: petLocationDTO_Res[] = await Promise.all(locatePromises);

//     return res.status(200).send({
//         success: true,
//         errorMessage: null,
//         data: locate
//     });
// })

router.get("/location/all", authorize, async (req, res) => {
    var list: petLocation[] = await fireservice.list<petLocation>("petLocations");
    // var locate: petLocationDTO_Res[] = [];
    // var bucket = admin.storage().bucket();

    const locatePromises = list.map(async (i) => {
        // var file = bucket.file(`pets/${i.petId}/thumb`);
        // var image = await file.getSignedUrl({
        //     expires: Date.now() + 60 * 60 * 1000,
        //     action: "read",
        //     version: "v4"
        // });

        return {
            lat: i.lat,
            lng: i.lng,
            petId: i.petId,
            petImage: ""
        };
    })

    var locate: petLocationDTO_Res[] = await Promise.all(locatePromises);

    // return res.Ok({
    //     success: true,
    //     errorMessage: null,
    //     data: locate
    // })
    return res.status(200).send({
        success: true,
        errorMessage: null,
        data: locate
    })
})


router.put("/find/update", authorize, async (req, res) => {
    const data = req.body as PetFindEditDTO_Req;

    var pet = await fireservice.get<pet>("pets", data.petId);

    if (!pet) return res.status(400).send({
        data: null,
        errorMessage: "Pet não encontrada.",
        success: false
    });

    if (req.user!.uid !== pet.userId)
        return res.status(400).send({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        });

    var newLocation = await googleService.Geocode.GetByAddress(data.localicacao);

    await fireservice.update<pet>("pets", {
        descricao: data.descricao,
        id: data.petId,
        localizacao: data.localicacao,
        status: data.status,
        userId: pet.userId,
        coleira: pet.coleira,
        apelido: pet.apelido
    });

    var petLocationInstance = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: data.petId },
    });

    if (!petLocationInstance) {
        await fireservice.register<petLocation>("petLocations", {
            lat: newLocation?.results[0].geometry.location.lat!,
            lng: newLocation?.results[0].geometry.location.lng!,
            petId: data.petId
        });
    } else {
        await fireservice.update<petLocation>("petLocations", {
            id: petLocationInstance.id,
            lat: newLocation?.results[0].geometry.location.lat!,
            lng: newLocation?.results[0].geometry.location.lng!,
            petId: data.petId
        });
    }

    res.status(200).send({
        data: {},
        errorMessage: null,
        success: true
    });
});

router.delete("/find/remove", async (req, res) => {
    const data = req.body as PetFindDeleteDTO_Res;

    var petInstance = await fireservice.get<pet>("pets", data.petId);

    if (!petInstance)
        return res.status(400).send({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        });

    if (petInstance.userId !== req.user?.uid)
        return res.status(400).send({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        });

    await fireservice.remove("pets", data.petId);

    var petLocationInstance = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: data.petId }
    });

    if (petLocationInstance)
        await fireservice.remove("petLocations", petLocationInstance.id);

    return res.status(200).send({
        data: null,
        errorMessage: null,
        success: true
    });
});

router.post("/find/register", authorize, upload.single("img"), async (req, res) => {
    const data = req.body as RegisterFindPetDTO_Req;

    try {
        var file = req.file;
        if (!file) return res.status(400).send({
            data: null,
            errorMessage: "É necessário inserir a imagem do pet",
            success: false
        });

        var location = await googleService.Geocode.GetByAddress(data.localizacao);
        console.log({ data: data.localizacao, location });
        if (location == null)
            return res.status(400).send("Localização (lat,lng) não foi encontrada.");

        if (location.results[0]?.geometry == undefined)
            return res.status(400).send({
                data: null,
                errorMessage: "Localização não encontrada. Por favor, cite mais informações de localização e tente novamente.",
                success: false,
            });

        const newPet = await fireservice.register<pet>("pets", {
            userId: req.user?.uid!,
            apelido: data.apelido,
            localizacao: data.localizacao,
            descricao: data.descricao,
            status: data.status,
            coleira: data.coleira == "true"
        });

        await fireservice.register<petLocation>("petLocations", {
            lat: location.results[0].geometry.location.lat,
            lng: location.results[0].geometry.location.lng,
            petId: newPet.id
        });

        const bk = admin.storage().bucket();
        var fileName = `pets/${newPet.id}/thumb`;
        const filess = bk.file(fileName);
        await filess.save(file.buffer, {
            metadata: {
                contentType: req.file?.mimetype
            }
        });

        return res.status(200).send({
            data: {},
            errorMessage: null,
            success: true
        });
    } catch (error) {
        var errorAny = error as any;
        var errorString = errorAny.toString();
        return res.status(500).send({
            data: null,
            errorMessage: errorString,
            success: false
        });
    }
});

router.post("/locateByLatLng", authorize, async (req, res) => {
    const data = req.body as LocateByLatLngDTO_Req;

    var locate = await googleService.Geocode.GetByLatLng(data.lat, data.lng);

    return res.status(200).send({
        data: locate?.results[0].formatted_address,
        errorMessage: null,
        success: true
    });
});

router.get("/find/get/:id", authorize, async (req, res) => {
    const { id } = req.params;

    var pet = await fireservice.get<pet>("pets", id);

    if (!pet) return res.status(400).send({
        data: null,
        errorMessage: "Pet não encontrado",
        success: false
    });

    var petLocation = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: pet.id }
    });

    if (!petLocation) return res.status(400).send({
        data: null,
        errorMessage: "Localização do pet não encontrada.",
        success: false
    });

    var bucket = admin.storage().bucket();
    var file = bucket.file(`pets/${pet.id}/thumb`);
    var image = await file.getSignedUrl({
        expires: Date.now() + 60 * 60 * 1000,
        action: "read",
        version: "v4"
    });

    var item: DetailFindPetDTO_Res = {
        apelido: pet.apelido,
        descricao: pet.descricao,
        lat: petLocation.lat,
        lng: petLocation.lng,
        localizacao: pet.localizacao,
        userId: pet.userId,
        petImage: image[0],
        coleira: pet.coleira
    }

    return res.status(200).send({
        errorMessage: null,
        success: true,
        data: item
    });
});

router.get("/myPets", authorize, async (req, res) => {

    try {
        const userId = req.user?.uid;

        var allPets: pet[] = await fireservice.list<pet>("pets");
        const userPets = allPets.filter(pet => pet.userId === userId);

        return res.status(200).send({
            errorMessage: null,
            success: true,
            data: {
                list: userPets
            }
        })

    } catch (error) {
        return res.status(200).send({
            data: null,
            errorMessage: "Não foi possível achar os pets do usuário.",
            status: 500,
            success: false
        })
    }
})

router.get("/find/search", authorize, async (req, res) => {
    /**#swagger.summary = "Pesquisa por pets usando um único parâmetro." */
    const { query } = req.query; // Recebe a variável genérica 'query'

    if (!query) {
        return res.status(400).send({
            data: null,
            errorMessage: "Query de pesquisa é necessária.",
            success: false,
        })
    }

    try {
        // Recupera todos os pets
        const allPets: pet[] = await fireservice.list<pet>("pets");

        // Filtra pets por apelido, descrição ou localização que contenham a query
        const filteredPets = allPets.filter((pet) =>
            pet.apelido?.toLowerCase().includes(query.toString().toLowerCase()) ||
            pet.descricao?.toLowerCase().includes(query.toString().toLowerCase()) ||
            pet.localizacao?.toLowerCase().includes(query.toString().toLowerCase())
        );

        // Para cada pet filtrado, gera a URL da imagem
        const petsWithImages = await Promise.all(filteredPets.map(async (pet) => {
            // Obtém a imagem do pet do Firebase Storage
            const bucket = admin.storage().bucket();
            const file = bucket.file(`pets/${pet.id}/thumb`);
            const imageUrl = await file.getSignedUrl({
                expires: Date.now() + 60 * 60 * 1000, // A URL expira em 1 hora
                action: "read",
                version: "v4"
            });

            // Adiciona a URL da imagem ao objeto do pet
            return { ...pet, imageUrl: imageUrl[0] };
        }));

        return res.status(200).send({
            errorMessage: null,
            success: true,
            data: petsWithImages,
        });
    } catch (error) {
        return res.status(200).send({
            data: null,
            errorMessage: "Erro ao pesquisar pets.",
            success: false,
        });
    }
});



const PetController = router;
export default PetController;

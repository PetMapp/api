import express from "express";
import axios from "axios";
import multer from 'multer';
import { admin } from "../firebase";
import authorize from "../middleware/authorize";
import FirebaseService from "../services/FirebaseService";
import pet from "../models/entities/pet";
import petLocation from "../models/entities/petLocation";
import RegisterFindPetDTO_Req from "../DTOs/request/RegisterFindPetDTO_Req";
import PetFindEditDTO_Req from "../DTOs/request/PetFindEditDTO_Req";
import PetFindDeleteDTO_Res from "../DTOs/request/PetFindDeleteDTO_Res";
import DetailFindPetDTO_Res from "../DTOs/response/DetailFindPetDTO_Res";
import petLocationDTO_Res from "../DTOs/response/PetLocationDTO_Res";
import LocateByLatLngDTO_Req from "../DTOs/request/LocateByLatLngDTO_Req";
import { getDistanceFromLatLonInKm } from "../utils/distance";

const router = express.Router();
var fireservice = new FirebaseService();

var storage = multer.memoryStorage();
var upload = multer({ storage });

// router.get("/getIamge", async (req, res) => {
//     var bucket = admin.storage().bucket();

//     var file = bucket.file("bg.png");

//     var image = await file.getSignedUrl({
//         expires: Date.now() + 60 * 60 * 1000,
//         action: "read",
//         version: "v4"
//     });

//     return res.Ok({
//         data: image,
//         errorMessage: null,
//         success: true
//     })

// })

router.get("/location/all", async (req, res) => {
    /*#swagger.summary = "Lista todas as localizações dos pets, incluindo se estão desaparecidos" */
    const locations: petLocation[] = await fireservice.list<petLocation>("petLocations");
    const pets: pet[] = await fireservice.list<pet>("pets");
    const bucket = admin.storage().bucket();

    const locatePromises = locations.map(async loc => {
        const petEntity = pets.find(p => p.id === loc.petId);
        const file = bucket.file(`pets/${loc.petId}/thumb`);
        const [url] = await file.getSignedUrl({
            expires: Date.now() + 60 * 60 * 1000,
            action: "read",
            version: "v4",
        });

        return {
            lat: loc.lat,
            lng: loc.lng,
            petId: loc.petId,
            petImage: url || "",
            isMissing: petEntity?.isMissing ?? false,
        } as petLocationDTO_Res;
    });

    const locate: petLocationDTO_Res[] = await Promise.all(locatePromises);

    return res.Ok({
        success: true,
        errorMessage: null,
        data: locate
    });
});


router.put("/find/update", authorize, async (req, res) => {
    /*#swagger.summary = "Alterar informações/localização do Pet." */
    const data = req.body as PetFindEditDTO_Req;

    const pet = await fireservice.get<pet>("pets", data.petId);

    if (!pet) {
        return res.BadRequest({
            data: null,
            errorMessage: "Pet não encontrado.",
            success: false
        });
    }

    if (req.user!.uid !== pet.userId) {
        return res.BadRequest({
            data: null,
            errorMessage: "Você não é o dono do pet para realizar alterações.",
            success: false
        });
    }

    const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.localicacao)}`;
    const responseGeo = await axios.get(nominatimUrl, {
        headers: { 'User-Agent': 'mapets/1.0' }
    });

    const location = responseGeo.data[0];
    if (!location) {
        return res.status(400).send("Localização (lat,lng) não foi encontrada.");
    }

    await fireservice.update<pet>("pets", {
        descricao: data.descricao,
        id: data.petId,
        localizacao: data.localicacao,
        status: data.status,
        userId: pet.userId,
        coleira: pet.coleira,
        apelido: pet.apelido,
        createdAt: new Date().toISOString()
    });

    const petLocationInstance = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: data.petId },
    });

    if (!petLocationInstance) {
        await fireservice.register<petLocation>("petLocations", {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
            petId: data.petId
        });
    } else {
        await fireservice.update<petLocation>("petLocations", {
            id: petLocationInstance.id,
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
            petId: data.petId
        });
    }

    return res.Ok({
        data: {},
        errorMessage: null,
        success: true
    });
});

router.delete("/find/remove", authorize, async (req, res) => {
    const data = req.body as PetFindDeleteDTO_Res;

    var petInstance = await fireservice.get<pet>("pets", data.petId);

    if (!petInstance)
        return res.BadRequest({
            data: null,
            errorMessage: "Pet não encontrado.",
            success: false
        });

    if (petInstance.userId !== req.user?.uid)
        return res.BadRequest({
            data: null,
            errorMessage: "você não é o dono do pet para realizar alterações.",
            success: false
        })

    await fireservice.remove("pets", data.petId);

    var petLocationInstance = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: data.petId }
    })

    if (petLocationInstance)
        await fireservice.remove("petLocations", petLocationInstance.id);

    return res.Ok({
        data: null,
        errorMessage: null,
        success: true
    })
})

router.post("/find/register", authorize, upload.single("img"), async (req, res) => {
    /**#swagger.summary = "Endpoint de registro de um novo pet e registrar no mapa." */
    const data = req.body as RegisterFindPetDTO_Req;

    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({
                data: null,
                errorMessage: "É necessário inserir a imagem do pet",
                success: false
            });
        }

        // Geocodificação usando Nominatim
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.localizacao)}`;
        const responseGeo = await axios.get(nominatimUrl, {
            headers: { 'User-Agent': 'mapets/1.0' }
        });

        const location = responseGeo.data[0];
        if (!location) {
            return res.status(400).send("Localização (lat,lng) não foi encontrada.");
        }

        // Criação do pet
        const newPet = await fireservice.register<pet>("pets", {
            userId: req.user?.uid!,
            apelido: data.apelido,
            localizacao: data.localizacao,
            descricao: data.descricao,
            status: data.status,
            coleira: data.coleira === "true",
            createdAt: new Date().toISOString(),
            isMissing: data.isMissing === "true",
            missingSince: data.missingSince ?? null,
            lastSeenLocation: data.lastSeenLocation ?? null
        });

        // Registro da localização
        await fireservice.register<petLocation>("petLocations", {
            lat: parseFloat(location.lat),
            lng: parseFloat(location.lon),
            petId: newPet.id
        });

        // Upload da imagem
        const bk = admin.storage().bucket();
        const fileName = `pets/${newPet.id}/thumb`;
        const firebaseFile = bk.file(fileName);
        await firebaseFile.save(file.buffer, {
            metadata: { contentType: file.mimetype }
        });

        return res.status(201).json({ message: 'Pet cadastrado com sucesso!' });

    } catch (error: any) {
        console.error("Erro ao cadastrar pet:", error.message);
        return res.status(500).json({
            data: null,
            errorMessage: error.message,
            success: false
        });
    }
});

router.post("/locateByLatLng", authorize, async (req, res) => {
    const data = req.body as LocateByLatLngDTO_Req;

    try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${data.lat}&lon=${data.lng}`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'mapets/1.0' }
        });

        const address = response.data?.display_name;

        return res.Ok({
            data: address ?? null,
            errorMessage: null,
            success: true
        });
    } catch (error: any) {
        console.error("Erro ao localizar endereço:", error.message);
        return res.status(500).json({
            data: null,
            errorMessage: "Erro ao localizar endereço pelo lat/lng.",
            success: false
        });
    }
});


router.get("/find/get/:id", async (req, res) => {
    const { id } = req.params;

    var pet = await fireservice.get<pet>("pets", id);

    if (!pet) return res.BadRequest({
        data: null,
        errorMessage: "Pet não encontrado",
        success: false
    })

    var petLocation = await fireservice.find<petLocation>("petLocations", {
        petId: { operator: "==", value: pet.id }
    });

    if (!petLocation) return res.BadRequest({
        data: null,
        errorMessage: "Localização do pet não encontrada.",
        success: false
    })

    var bucket = admin.storage().bucket();
    var file = bucket.file(`pets/${pet.id}/thumb`);
    var image = await file.getSignedUrl({
        expires: Date.now() + 60 * 60 * 1000,
        action: "read",
        version: "v4"
    });

    return res.Ok({
        errorMessage: null,
        success: true,
        data: {
            apelido: pet.apelido,
            descricao: pet.descricao,
            lat: petLocation.lat,
            lng: petLocation.lng,
            localizacao: pet.localizacao,
            userId: pet.userId,
            petImage: image[0],
            coleira: pet.coleira,
            createdAt: pet.createdAt,
            isMissing: pet.isMissing
        } as DetailFindPetDTO_Res
    })

})

router.get("/myPets", authorize, async (req, res) => {
    /**#swagger.summary = "Endpoint para retornar os pets do usuário logado." */

    try {
        const userId = req.user?.uid;

        var allPets: pet[] = await fireservice.list<pet>("pets");
        const userPets = allPets.filter(pet => pet.userId === userId);

        return res.Ok({
            errorMessage: null,
            success: true,
            data: {
                list: userPets
            }
        });
    } catch (error) {
        return res.BadRequest({
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
        return res.BadRequest({
            data: null,
            errorMessage: "Query de pesquisa é necessária.",
            success: false,
        });
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

        return res.Ok({
            errorMessage: null,
            success: true,
            data: petsWithImages,
        });
    } catch (error) {
        return res.BadRequest({
            data: null,
            errorMessage: "Erro ao pesquisar pets.",
            success: false,
        });
    }
});

router.get("/petFinder/list", authorize, async (req, res) => {
    /**
     * #swagger.summary = "Retorna pets desaparecidos próximos ao usuário"
     * #swagger.parameters['lat'] = { in: 'query', description: 'Latitude do usuário', required: true }
     * #swagger.parameters['lng'] = { in: 'query', description: 'Longitude do usuário', required: true }
     * #swagger.parameters['radius'] = { in: 'query', description: 'Raio em km', required: false, default: 5 }
     */
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
        return res.BadRequest({
            data: null,
            errorMessage: "Latitude e longitude são obrigatórias.",
            success: false
        });
    }

    const userLat = parseFloat(lat as string);
    const userLng = parseFloat(lng as string);
    const searchRadius = parseFloat(radius as string) || 5;

    try {
        const allPets: pet[] = await fireservice.list<pet>("pets");
        const allLocations: petLocation[] = await fireservice.list<petLocation>("petLocations");

        const missingPets = allPets.filter(p => p.isMissing);

        const petsNearby = await Promise.all(
            missingPets.map(async (pet) => {
                const location = allLocations.find(loc => loc.petId === pet.id);
                if (!location) return null;

                const distance = getDistanceFromLatLonInKm(userLat, userLng, location.lat, location.lng);
                if (distance > searchRadius) return null;

                // Imagem
                const bucket = admin.storage().bucket();
                const file = bucket.file(`pets/${pet.id}/thumb`);
                const imageUrl = await file.getSignedUrl({
                    expires: Date.now() + 60 * 60 * 1000,
                    action: "read",
                    version: "v4"
                });

                return {
                    petId: pet.id,
                    apelido: pet.apelido,
                    descricao: pet.descricao,
                    localizacao: pet.localizacao,
                    lat: location.lat,
                    lng: location.lng,
                    imageUrl: imageUrl[0],
                    distanciaKm: distance.toFixed(2)
                };
            })
        );

        const filteredPets = petsNearby.filter(p => p !== null);

        return res.Ok({
            success: true,
            errorMessage: null,
            data: filteredPets
        });

    } catch (error: any) {
        console.error("Erro ao listar pets desaparecidos:", error.message);
        return res.status(500).json({
            data: null,
            errorMessage: "Erro interno ao buscar pets desaparecidos.",
            success: false
        });
    }
});

const PetController = router;
export default PetController;
import fbEntity from "./fbEntity";

export default interface petLocation extends fbEntity {
    lat: number,
    lng: number,
    petId: string
}
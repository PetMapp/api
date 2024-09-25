import fbEntity from "./fbEntity"

export default interface pet extends fbEntity {
    userId: string
    apelido?: string
    localizacao: string
    lat: number
    lng: number
}
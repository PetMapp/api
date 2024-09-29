import fbEntity from "./fbEntity"

export default interface pet extends fbEntity {
    userId: string
    apelido?: string
    localizacao: string
    descricao: string
    status: string
}
import fbEntity from "./fbEntity"

export default interface post extends fbEntity {
    userId: string
    titulo: string
    descricao: string
    coleira: boolean
    status?: string
}
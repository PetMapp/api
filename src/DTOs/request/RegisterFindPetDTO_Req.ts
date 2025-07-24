export default interface RegisterFindPetDTO_Req {
    apelido?: string;
    localizacao: string;
    descricao: string;
    status: string;
    coleira: string;
    isMissing?: string;
    missingSince?: string;
    lastSeenLocation?: string;
}
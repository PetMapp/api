export default interface BadRequestModel {
    success: false,
    errorMessage: string | null,
    status?: number
    data: any
}
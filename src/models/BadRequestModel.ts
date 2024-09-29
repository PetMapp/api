export default interface BadRequestModel {
    success: false,
    errorMessage: string | null,
    data: any
}
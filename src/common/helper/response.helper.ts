export class ResponseHelper {
  static success({
    data,
    message,
    meta_data,
  }: {
    data: any;
    message: string;
    meta_data?: any;
  }) {
    return {
      success: true,
      message,
      data,
      ...(meta_data && { meta_data }),
    };
  }

  static error({
    message,
    data,
    meta_data,
  }: {
    message: string;
    data?: any;
    meta_data?: any;
  }) {
    return {
      success: false,
      message,
      ...(data && { data }),
      ...(meta_data && { meta_data }),
    };
  }
}

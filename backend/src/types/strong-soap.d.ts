declare module 'strong-soap' {
  export const SOAP: {
    createServer: (services: any, wsdl: string) => any;
    listen: (server: any, path: string, services: any) => void;
  };

  export default {
    SOAP,
  };
}

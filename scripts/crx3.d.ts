declare module "crx3" {
  const writeCrx3File: (files: string[], options: {
    keyPath: string;
    crxPath: string;
  }) => Promise<void>;
  export default writeCrx3File;
}

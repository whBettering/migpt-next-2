export function assert(condition: boolean, message: string) {
  if (!condition) {
    console.log(message);
    process.exit(-1);
  }
}

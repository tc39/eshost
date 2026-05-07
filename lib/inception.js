export function inception(runtime) {
  return runtime.replace("$SOURCE", JSON.stringify(runtime.replace("$SOURCE", '""')));
}

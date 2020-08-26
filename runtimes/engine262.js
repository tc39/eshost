{
  const { createRealm } = $262;
  $262.createRealm = (options) => {
    options = options || {};
    options.globals = options.globals || {};

    const realm = createRealm();
    realm.evalScript($262.source);

    for (const glob in options.globals) {
      realm.$262.global[glob] = options.globals[glob];
    }
    if (options.destroy) {
      realm.$262.destroy = options.destroy;
    }

    return realm;
  };
  $262.getGlobal = (name) => $262.global[name];
  $262.setGlobal = (name, value) => {
    $262.global[name] = value;
  };
  $262.destroy = () => {};
  $262.source = $SOURCE;
}

function resolveRef(schema, spec) {
  let current = schema;
  while (current && current.$ref) {
    const path = current.$ref.replace(/^#\//, '').split('/');
    current = path.reduce((node, key) => node[key], spec);
  }
  return current;
}

function flatten(schema, spec) {
  const resolved = resolveRef(schema, spec);
  if (!resolved.allOf) return resolved;

  return resolved.allOf.map((part) => flatten(part, spec)).reduce(
    (merged, part) => ({
      ...merged,
      ...part,
      properties: { ...merged.properties, ...part.properties },
      required: [...(merged.required || []), ...(part.required || [])]
    }),
    { type: 'object' }
  );
}

function typeOf(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
}

function collectErrors(value, schema, spec, path = '$') {
  const node = flatten(schema, spec);
  const errors = [];

  if (node.type) {
    const actual = typeOf(value);
    const ok = actual === node.type || (node.type === 'number' && actual === 'integer');
    if (!ok) return [`${path}: expected ${node.type}, got ${actual}`];
  }

  if (node.enum && !node.enum.includes(value)) {
    errors.push(`${path}: ${JSON.stringify(value)} is not one of ${node.enum.join(', ')}`);
  }

  if (node.type === 'array' && node.items) {
    value.forEach((item, i) => errors.push(...collectErrors(item, node.items, spec, `${path}[${i}]`)));
  }

  if (node.type === 'object') {
    const declared = node.properties || {};
    (node.required || []).forEach((key) => {
      if (!(key in value)) errors.push(`${path}.${key}: required but missing`);
    });
    Object.keys(value).forEach((key) => {
      if (!(key in declared)) {
        errors.push(`${path}.${key}: not described in Swagger`);
      } else {
        errors.push(...collectErrors(value[key], declared[key], spec, `${path}.${key}`));
      }
    });
  }

  return errors;
}

function responseSchema(spec, route, method, status) {
  return spec.paths[route][method].responses[status].content['application/json'].schema;
}

module.exports = { collectErrors, responseSchema };

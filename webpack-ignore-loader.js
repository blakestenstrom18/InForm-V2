// Simple noop loader to ignore binary files (.node, .wasm, etc.)
module.exports = function ignoreLoader(source) {
  // Return an empty module export to prevent webpack from parsing binary files
  return 'module.exports = {};';
};


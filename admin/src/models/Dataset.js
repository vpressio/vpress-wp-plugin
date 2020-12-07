const Dataset = function (id, name, slug, description, owner_id, permissions, source, tag, variables, dateFormat, rows, size) {
  this.id = id,
  this.name = name,
  this.slug = slug,
  this.description = description,
  this.owner_id = owner_id,
  this.permissions = permissions,
  this.source = source,
  this.tags = tag,
  this.variables = variables
  this.dateFormat = dateFormat
  this.rows = rows
  this.size = size
}

export default Dataset
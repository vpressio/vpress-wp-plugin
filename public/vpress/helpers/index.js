import * as d3 from "https://cdn.skypack.dev/d3@5";

const selectAggregateFunction = (func) => {
  switch (func) {
    case 'sum':
      return 'SUM'
    case 'mean':
    return 'AVG'
    case 'min':
      return 'MIN'
    case 'max':
      return 'MAX'
    default:
      return 'AVG'
  }
}

const sanitizeSpaces = (columnName) => {
  return /\s/g.test(columnName)
    ? '`' + columnName + '`'
    : columnName
}


export const extractDataType = (dataSample) => {
  const dateFormats = ['%Y/%m/%d', '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'];
  const dataSampleEntries = Object.entries(dataSample);
  let dateFormat = null
  const variables = dataSampleEntries
    .map(sampleValue => {
      const dataType = dateFormats.reduce((acc, format) => {
        if (d3.timeParse(format)(sampleValue[1]) !== null) {
          acc.type = 'date';
          dateFormat = format;
        } else if (isNaN(+sampleValue[1]) && acc.format === undefined) {
          acc.type = 'ordinal';
        }
        return acc;
      }, { type: 'linear' })
      const variable = {
        title : sampleValue[0],
        slug : sampleValue[0],
        type : dataType.type
      }
      if (variable.type === 'linear') {
        variable.func = ''
      }
      return variable
    })
  return { variables, dateFormat }
};


export const queryBody = (context, table_name) => {
  const body = {}
  body['dataset'] = `vpress_${table_name}`
  body['chart_type'] = context.chart
  const {
    xAxis,
    yAxis,
    collapseBy,
    groupBy,
    filters,
    orderBy
  } = context;

  body['context'] = context;

  if (xAxis.type === 'linear' && yAxis.type === 'linear') {
    if (xAxis.slug === 'total_count' && yAxis.slug === 'total_count') {
      throw new Error('Combinación de variables inválida.')
    }
    if (xAxis.slug === 'total_count' || yAxis.slug === 'total_count') {
      const variable = xAxis.slug !== 'total_count'
        ? xAxis
        : yAxis
      body['function_operation_2'] = 'COUNT(*)'
      body['function_alias_2'] = 'total_count'
      if (variable.func && variable.func !== '') {
        body['column_head'] = variable.slug
      } else {
        body['aggregate_column_head'] = sanitizeSpaces(variable.slug)
        body['aggregate_head'] = selectAggregateFunction(variable.func)
      }

      if (collapseBy.slug !== '') {
        body['aggregate_column_3'] = sanitizeSpaces(collapseBy.slug)
        body['aggregate_3'] = selectAggregateFunction(collapseBy.func)
      }
      if (groupBy.slug !== '') {
        body['linear_column_4'] = sanitizeSpaces(groupBy.slug)
      }
    } else if (
      (xAxis.func && xAxis.func !== '') ||
      (yAxis.func && yAxis.func !== '') ||
      (collapseBy.func && collapseBy.func !== '')
    ) {
      if (xAxis.func !== '') {
        body['aggregate_column_head'] = sanitizeSpaces(xAxis.slug)
        body['aggregate_head'] = selectAggregateFunction(xAxis.func)
      } else {
        body['column_head'] = sanitizeSpaces(xAxis.slug)
      }
      if (yAxis.func !== '') {
        body['aggregate_column_2'] = sanitizeSpaces(yAxis.slug)
        body['aggregate_2'] = selectAggregateFunction(yAxis.func)
      } else {
        body['column_2'] = sanitizeSpaces(yAxis.slug)
      }

      if (collapseBy.slug !== '' && (collapseBy.slug !== xAxis.slug && collapseBy.slug !== yAxis.slug)) {
        if (collapseBy.slug === 'total_count') {
          body['function_operation_2'] = 'COUNT(*)'
          body['function_alias_2'] = 'total_count'
        } else {
          body['aggregate_column_3'] = sanitizeSpaces(collapseBy.slug)
          body['aggregate_3'] = selectAggregateFunction(xAxis.func)
        }
      }
      if (groupBy.slug !== '') {
        body['linear_column_4'] = sanitizeSpaces(groupBy.slug)
      }
    } else {
      body['linear_column_head'] = sanitizeSpaces(xAxis.slug)
      body['linear_column_2'] = sanitizeSpaces(yAxis.slug)
      if (
        collapseBy.slug !== '' &&
        (collapseBy.slug !== xAxis.slug && collapseBy.slug !== yAxis.slug)
      ) {
        body['linear_column_3'] = sanitizeSpaces(collapseBy.slug)
      }
      if (groupBy.slug !== '' && (groupBy.slug !== xAxis.slug && groupBy.slug !== yAxis.slug)) {
        body['linear_column_4'] = sanitizeSpaces(groupBy.slug)
      }
    }

  } else if (
    (xAxis.type === 'ordinal' || xAxis.type === 'date') &&
    (yAxis.type === 'ordinal' || yAxis.type === 'date')
  ) {
    body['column_head'] = sanitizeSpaces(xAxis.slug)
    body['column_2'] = sanitizeSpaces(yAxis.slug)
    if (collapseBy.slug !== '') {
      if (collapseBy.slug === 'total_count') {
        body['function_operation_2'] = 'COUNT(*)'
        body['function_alias_2'] = 'total_count'
      } else {
        body['aggregate_column_2'] = sanitizeSpaces(collapseBy.slug)
        body['aggregate_2'] = selectAggregateFunction(collapseBy.func)
      }
    }
   } else if (
    (
      (xAxis.type === 'linear' && (yAxis.type === 'ordinal' || yAxis.type === 'date')) ||
      (yAxis.type === 'linear' && (xAxis.type === 'ordinal' || xAxis.type === 'date'))
    )
  ) {
    const linearAxis = xAxis.type === 'linear'
      ? xAxis
      : yAxis
    const ordinalAxis = xAxis.type === 'linear'
      ? yAxis
      : xAxis

    body['column_head'] = sanitizeSpaces(ordinalAxis.slug)
    if (linearAxis.slug === 'total_count') {
      body['function_operation_2'] = 'COUNT(*)'
      body['function_alias_2'] = 'total_count'
    } else {
      body['aggregate_2'] = selectAggregateFunction(linearAxis.func)
      body['aggregate_column_2'] = sanitizeSpaces(linearAxis.slug)
    }
    if (collapseBy.slug !== '' && collapseBy.slug !== linearAxis.slug) {
      body['aggregate_column_3'] = sanitizeSpaces(collapseBy.slug)
      body['aggregate_3'] = selectAggregateFunction(collapseBy.func)
    }
    if (groupBy.slug !== '' && ordinalAxis.slug !== groupBy.slug) {
      body['column_3'] = sanitizeSpaces(groupBy.slug)
    }
  } else if (
    ( xAxis.type === 'linear' && yAxis.slug === '' ) ||
    ( yAxis.type === 'linear' && xAxis.slug === '' )
  ) {
    const linearAxis = xAxis.type === 'linear'
      ? xAxis
      : yAxis
    body['aggregate_column_head'] = sanitizeSpaces(linearAxis.slug)
    body['aggregate_head'] = selectAggregateFunction()
    if (collapseBy.slug !== '' && (collapseBy.slug !== linearAxis.slug)) {
      body['aggregate_column_2'] = sanitizeSpaces(collapseBy.slug)
      body['aggregate_2'] = selectAggregateFunction(collapseBy.func)
    }
    if (groupBy.slug !== '') {
      body['column_2'] = sanitizeSpaces(groupBy.slug)
    }
  } else if (
    (yAxis.slug === '' && (xAxis.type === 'ordinal' || xAxis.type === 'date')) ||
    (xAxis.slug === '' && (yAxis.type === 'ordinal' || yAxis.type === 'date'))
  ) {
    const ordinalAxis = xAxis.type === 'ordinal' || xAxis.type === 'date'
      ? xAxis
      : yAxis
    body['column_2'] = sanitizeSpaces(ordinalAxis.slug)
    body['function_operation_head'] = 'COUNT(*)'
    body['function_alias_head'] = 'total_count'
    if (collapseBy.slug !== '') {
      body['aggregate_column_3'] = sanitizeSpaces(collapseBy.slug)
      body['aggregate_3'] = selectAggregateFunction(collapseBy.func)
    }
    if (groupBy.slug !== '') {
      body['column_3'] = sanitizeSpaces(groupBy.slug)
    }
  } else {
    throw new Error('Invalid chart query')
  }

  if (filters.length > 0) {
    body['where'] = filters.map(clause => {
      return {
        op: clause.type !== 'ordinal' && clause.value.length === 2
          ? 'BETWEEN'
          : 'IN',
        column: sanitizeSpaces(clause.slug),
        value: clause.value
      }
    })
  }
  body['order_by'] = orderBy.slug === ''
    ? null
    : `${orderBy.slug} ${orderBy.order.toUpperCase()}`
  return body
}


import * as d3 from 'd3';
import { remove } from 'lodash'
import VpressError from './vpressError';

export const queryByChart =  (chartValues, { newValue, mergeType } ) => {
  try {
    const payload = {
      chartValues,
      mutationType: mergeType,
      newValue: newValue
    }
    const callback = {
      filter: setFilters,
      orderBy: setOrder,
      collapseBy: setCollapse,
      groupBy: setGroupBy,
      xAxis: setAxisByChart,
      yAxis: setAxisByChart,
      chart: setValue
    }[mergeType]

    return callback(payload)
  } catch (error) {
    if (error instanceof VpressError) {
      throw new VpressError (
          error.valueName,
          error.message
      )
    } else {
      throw new VpressError (
        mergeType,
        error.message
      )
    }
  }

}

const setCollapse = ({ chartValues, mutationType, newValue }) => {
  if (newValue.type === 'linear' || newValue.slug === '') {
    chartValues[mutationType] = newValue;
  }
  return chartValues
}

const setGroupBy= ({chartValues, mutationType, newValue}) => {
  if (newValue.type !== 'linear' || newValue.slug === '') {
    chartValues[mutationType] =
      chartValues.xAxis.slug === chartValues.groupBy.slug ||
      chartValues.yAxis.slug === chartValues.groupBy.slug
        ? { title: '', type: '', slug: '' }
        : newValue
  }
  return chartValues
}

const setAxisByChart = ({ chartValues, mutationType, newValue }) => {
  try {
    chartValues[mutationType] = newValue
    const mainAxis = mutationType === 'xAxis'
      ? chartValues['xAxis']
      : chartValues['yAxis']
    const oppAxis = mutationType === 'xAxis'
      ? chartValues['yAxis']
      : chartValues['xAxis']
    switch (chartValues.chart) {

      case 'bars':
        if (mainAxis.type === 'linear' && oppAxis.type === 'linear') {
          throw new VpressError( mutationType , 'Gráfica de barras es incompatible con dos ejes con valores lineares');
        }
        if (
          (mainAxis.type !== 'linear' && mainAxis.slug === chartValues.groupBy.slug) ||
          (oppAxis.type !== 'linear' && mainAxis.slug === chartValues.groupBy.slug)
        ) {
          chartValues.groupBy = { title: '', type: '', slug: '' }
        }
        if (mainAxis.type === 'linear') {
          if (!mainAxis.func || mainAxis.func === '') {
            chartValues[mutationType].func = 'sum'
          }
          chartValues.collapseBy = mainAxis
        } else if (oppAxis.type === 'linear') {
          chartValues.collapseBy = oppAxis
        }
        break;

      case 'heatmap':
        if (mainAxis.type !== 'linear' && oppAxis.type !== 'linear') {
          chartValues.groupBy = mainAxis
        }
        if (mainAxis.type !== 'linear') {
          chartValues.groupBy = mainAxis
        } else if (oppAxis.type !== 'linear') {
          chartValues.groupBy = oppAxis
        }
        if (mainAxis.type === 'linear' && oppAxis.type === 'linear') {
          throw new VpressError( mutationType , 'La gráfica Heatmap require de ambos ejes de tipo ordinal.');
        }
        break;

      case 'spineplot':
        if (mainAxis.type === 'linear' && oppAxis.type === 'linear') {
          throw new VpressError( mutationType , 'Gráfica Spineplot es incompatible con dos ejes con valores lineares');
        }
        if (
          (mainAxis.type !== 'linear' && mainAxis.slug === chartValues.groupBy.slug) ||
          (oppAxis.type !== 'linear' && mainAxis.slug === chartValues.groupBy.slug)
        ) {
          chartValues.groupBy = { title: '', type: '', slug: '' }
        }
        if (mainAxis.type === 'linear') {
          if (!mainAxis.func || mainAxis.func === '') {
            chartValues[mutationType].func = 'sum'
          }
          chartValues.collapseBy = mainAxis
        } else if (oppAxis.type === 'linear') {
          chartValues.collapseBy = oppAxis
        }
        break;

      case 'timeline':
        if (!(mainAxis.type === 'date' && oppAxis.type === 'linear')) {
          throw new VpressError( mutationType , 'Gráfica timeline debe contener una fecha en el Eje x y un valor numérico o linear en el eje y');
        }
        if (
          (mainAxis.type !== 'linear' && mainAxis.slug === chartValues.groupBy.slug) ||
          (oppAxis.type !== 'linear' && mainAxis.slug === chartValues.groupBy.slug)
        ) {
          chartValues.groupBy = { title: '', type: '', slug: '' }
        }
        if (mainAxis.type === 'linear') {
          if (!mainAxis.func || mainAxis.func === '') {
            chartValues[mutationType].func = 'sum'
          }
          chartValues.collapseBy = mainAxis
        } else if (oppAxis.type === 'linear') {
          chartValues.collapseBy = oppAxis
        }
        break;
    }
    return chartValues
  } catch (error) {
    throw new VpressError( mutationType , error.message);
  }

}

export const mergeChartVal =  (chartValues, { newValue, mutationType }) => {
  try {
      const payload = {
        chartValues,
        mutationType: mutationType,
        newValue: newValue
      }
    switch (mutationType) {
      case 'orderBy':
        return setOrder(payload)
      case 'invertAxis':
        return invertAxis(chartValues)
      case 'labelAxis':
        return labelAxis(payload)
      default:
        return setValue(payload)
    }
  } catch (error) {
      if (error instanceof VpressError) {
        throw new VpressError (
            error.valueName,
            error.message
        )
      } else {
        throw new VpressError (
          mutationType,
          error.message
        )
      }
    }
};

const setValue =  ({ chartValues, newValue, mutationType }) => {
  try {
    chartValues[mutationType] = newValue
    return chartValues
  } catch (error) {
    throw new VpressError( null , error.message);
  }
}

const setOrder =  ({ chartValues, newValue }) => {
  try {
    const order = newValue === 'asc' || newValue === 'desc'
      ? newValue
      : chartValues.orderBy.order;
    const slug = newValue !== 'asc' && newValue !== 'desc'
      ? newValue
      : chartValues.orderBy.slug;
      chartValues.orderBy = { order: order, slug: slug }
    return chartValues
  } catch (error) {
    throw new VpressError( null , error.message);
  }
}

export const invertAxis =  (chartValues) => {
  try {
    const xAxis = { ...chartValues.xAxis };
    const yAxis = { ...chartValues.yAxis };
    chartValues.xAxis = yAxis;
    chartValues.yAxis = xAxis;
    switch (chartValues.chart) {
      case 'heatmap':
        chartValues.xAxis === 'linear'
          ? chartValues.groupBy = yAxis
          : chartValues.groupBy = xAxis
        break
      case 'scatter':
        chartValues.yAxis === chartValues.groupBy
          ? chartValues.groupBy = chartValues.xAxis
          : chartValues.groupBy = chartValues.yAxis
        break
      default:
        break;
    }
    return chartValues
  } catch (error) {
    throw new VpressError( null , error.message);
  }
}

const labelAxis = ({ chartValues, newValue }) => {
  try {
    chartValues[newValue.axis].title = newValue.value
    return chartValues
  } catch (error) {
    throw new Error(error.message)
  }
}

const setFilters = ({ chartValues, newValue }) => {
  try {
    if (newValue.value === 'remove') {
      chartValues.filters = chartValues.filters.filter(filter => {
        return filter.slug !== newValue.slug
      });
    } else {
      remove(chartValues.filters, function(n) {
        return n.slug === newValue.slug;
      });
      chartValues.filters.push(newValue)
    }
    return chartValues
  } catch (error) {
    throw new Error(error.message)
  }
};

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

export const filterOrdinalParamsQuery = (body, column) => {
  body['order_by'] = `${sanitizeSpaces(column)} ASC`
  body['column_head'] = sanitizeSpaces(column)
  return body
}

export const filterLinearParamsQuery = (body, column) => {
  body['function_operation_head'] = `MIN(${sanitizeSpaces(column)})`
  body['function_alias_head'] = 'min'
  body['function_operation_2'] = `MAX(${sanitizeSpaces(column)})`
  body['function_alias_2'] = 'max'
  return body
}

export const queryBody = (context, table_name, query_url) => {
  const body = {}
  body['dataset'] = query_url ? `${table_name}` : `vpress_${table_name}`
  // body['queryUrl'] = query_url || 'wordpress'
  body['queryUrl'] = query_url
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

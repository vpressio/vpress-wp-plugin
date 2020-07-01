import * as _ from 'lodash';
import * as d3 from 'd3';
import VpressError from './vpressError';

const merge = async (chartValues, { newValue, mutationType }) => {
  try {
      const payload = {
        chartValues,
        mutationType: mutationType,
        newValue: newValue
      }
    if (mutationType === 'xAxis' || mutationType === 'yAxis') {
      return await setAxis(payload)
    }
    if (mutationType === 'aggregation') {
      return await setAggregate(payload)
    }
    if (mutationType === 'orderBy') {
      return await setOrder(payload)
    }
    if (mutationType === 'filter') {
      return await setFilters(payload)
    }
    return await setValue(payload)
    
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

const setValue = async ({ chartValues, newValue, mutationType }) => {
  try {
    chartValues[mutationType] = newValue
    return chartValues
  } catch (error) {
    throw new VpressError( _ , error.message);
  }
}

const setOrder = async ({ chartValues, newValue }) => {
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
    throw new VpressError( _ , error.message);
  }
}

const invertAxis = async ({ chartValues }) => {
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
    throw new VpressError( _ , error.message);
  }
}

const setAxis = async ({ chartValues, newValue, mutationType }) => {
  try {
    chartValues[mutationType] = newValue;
    if (
        !_.includes(
          [ chartValues.xAxis.slug, chartValues.yAxis.slug ],
          chartValues.collapseBy.slug
        )
      ) {
        chartValues.collapseBy = { title: '', type: 'linear', slug: '', func: ''};
    }
    switch (newValue.type) {
      case 'ordinal':
        if (
          chartValues.xAxis.type === chartValues.yAxis.type
        ) {
          chartValues.chart = chartValues.collapseBy.slug === ''
            ? 'heatmap'
            : 'spineplot';
          chartValues.groupBy = chartValues.yAxis;
        } else if (
          chartValues.xAxis.type === 'linear' ||
          chartValues.yAxis.type === 'linear'
        ) {
          chartValues.chart = 'bars';
          
          if (chartValues.groupBy === chartValues[mutationType]) {
            chartValues.groupBy = { title: '', type: 'ordinal', slug: ''}
          }
          
          if (chartValues.xAxis.type === 'linear') {
            chartValues.collapseBy = chartValues.xAxis
          } else if (chartValues.yAxis.type === 'linear') {
            chartValues.collapseBy = chartValues.yAxis
          }
        } else if (
          chartValues.xAxis.type === 'date' ||
          chartValues.yAxis.type === 'date'
          ) {
            chartValues.chart = chartValues.collapseBy.slug === ''
            ? 'heatmap'
            : 'spineplot';
          if (chartValues.xAxis.type === 'date') {
            chartValues.groupBy = chartValues.yAxis
          } else if (chartValues.yAxis.type === 'date') {
            chartValues.groupBy = chartValues.yAxis
          }
        }
        break;
      case 'linear':
        if (
          chartValues.xAxis.type === newValue.type &&
          chartValues.yAxis.type === newValue.type
        ) {
          chartValues.chart = 'scatter'
        } else if (
          chartValues.xAxis.type === 'ordinal' ||
          chartValues.yAxis.type === 'ordinal'
        ) {
          chartValues.chart = 'bars';
          
          if (chartValues.groupBy === chartValues.xAxis) {
            chartValues.groupBy = { title: '', type: 'ordinal', slug: ''}
          } else if (chartValues.groupBy === chartValues.yAxis) {
            chartValues.groupBy = { title: '', type: 'ordinal', slug: ''}
          }

          chartValues.collapseBy = newValue
        } else if (
          chartValues.xAxis.type === 'date' ||
          chartValues.yAxis.type === 'date'
        ) {
          if (chartValues.yAxis.type === 'date') {
            chartValues.chart = 'bars'
          }
          if (chartValues.xAxis.type === 'date') {
            chartValues.chart = 'timeline';
          }
          chartValues.collapseBy = newValue;
          chartValues.groupBy = { title: '', type: 'ordinal', slug: '' };
        }
        break;
      case 'date':
        chartValues.groupBy = { title: '', type: 'ordinal', slug: ''}
        if (
          chartValues.xAxis.type === chartValues.yAxis.type
        ) {
          chartValues.chart = 'heatmap'
          chartValues.collapseBy = { title: '', type: 'linear', slug: '', func: '' };
          chartValues.groupBy = chartValues.yAxis;
        }
        if (chartValues[mutationType] === chartValues.xAxis && chartValues.yAxis.type === 'linear') {
          chartValues.chart = 'timeline';
          chartValues.collapseBy = chartValues.yAxis;
        }
        if (chartValues[mutationType] === chartValues.yAxis && chartValues.xAxis.type === 'linear') {
          chartValues.chart = 'bars';
          chartValues.collapseBy = chartValues.xAxis
        }
        break
      case '':
        break
      default:
        throw new VpressError(newValue.title, 'Tipo de dato inválido.');
    }
    return chartValues;
  } catch (error) {
    throw new VpressError(error.valueName, error.message);
  }
};

const setAggregate = async (payload) => {
  try {
    const {
      chartValues,
      newValue
  } = payload;
    if (newValue.slug === '') {
    return removeAggregate(payload);
  }
    
  switch (chartValues.chart) {
    case 'bars':
      if (newValue.type === 'ordinal' && (chartValues.xAxis.slug !== newValue.slug && chartValues.yAxis.slug !== newValue.slug)) {
        chartValues.groupBy = newValue
      } else {
        chartValues.groupBy.title = newValue.title
        throw new VpressError(newValue.title,'Las gráficas de barra sólo pueden agruparse por una variable ordinal.')
      }
      break;
    case 'heatmap':
      if (newValue.type === 'linear') {
        chartValues.collapseBy = newValue;
      } else {
        chartValues.collapseBy.title = newValue.title
        throw new VpressError(newValue.title, 'Los heatmap sólo pueden agruparse por una variable linear.')
      }
      break;
      case 'spineplot':
        if (newValue.type === 'linear') {
          chartValues.collapseBy = newValue
        } else {
          chartValues.collapseBy.title = newValue.title
          throw new VpressError(newValue.title, 'Los spineplot sólo pueden agruparse por una variable linear.')
        }
        break;
      case 'scatter':
        if (newValue.type === 'ordinal') {
          chartValues.groupBy = newValue
        } else {
          chartValues.groupBy.title = newValue.title
          throw new VpressError(newValue.title, 'Los scatter sólo pueden agruparse por una variable linear u ordinal.')
        }
      break;
    case 'timeline':
      if (newValue.type === 'ordinal') {
        chartValues.groupBy = newValue
      } else {
        chartValues.groupBy.title = newValue.title
        throw new VpressError( newValue.title, 'Los timeline sólo pueden agruparse por una variable ordinal.')
      }
      break;
    default:
      throw new VpressError( newValue.title, 'Invalid chart type');
  }
    return chartValues;
  } catch (error) {
    throw new VpressError(error.valueName, error.message);
  }
};

const removeAggregate = async ({chartValues, newValue, mutationType}) => {
  try {
    switch (chartValues.chart) {
      case 'bars':
        chartValues.groupBy = newValue
        break
        case 'heatmap':
          chartValues.collapseBy = newValue
          break
        case 'spineplot':
          chartValues.collapseBy = newValue
          break
        case 'scatter':
          chartValues.collapseBy = newValue
          chartValues.groupBy = newValue
          break
        case 'timeline':
          chartValues.collapseBy = newValue
          chartValues.groupBy = newValue
        break
      default:
        throw new VpressError(mutationType,'Invalid chart type');
    }
    return chartValues;
  } catch (error) {
    throw new VpressError(error.value, error.message)
  }
}

const setFilters = ({ chartValues, newValue }) => {
  try {
    if (newValue.value === 'remove') {
      chartValues.filters = chartValues.filters.filter(filter => {
        return filter.slug !== newValue.slug
      });
    } else {
      chartValues.filters.push(newValue)
    }
    return chartValues
  } catch (error) {
    throw new Error(error.message)
  }
};

const extractDateFormat = (variables) => {
  return variables.reduce(
    (acc, variable) => {
      if (variable.type.format) {
        acc = variable.type.format
      }
      return acc
    },
    '%Y-%d-%m'
  )
};

const sortByDataType = (dataSample) => {
  const dateFormats = ['%Y/%m/%d','%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'];
  const dataSampleEntries = Object.entries(dataSample);
  return dataSampleEntries
    .map(variable => {
      return {
        title: variable[0],
        slug: variable[0],
        type: dateFormats.reduce((acc, dateFormat) => {
          if (d3.timeParse(dateFormat)(variable[1]) !== null) {
            acc.dataType = 'date';
            acc.format = dateFormat;
          }
          if (isNaN(+variable[1]) && acc.format === undefined) {
            acc.dataType = 'ordinal';
          }
          return acc;
        }, { dataType: 'linear' })
      }
    })
};
const filterOrdinalParamsQuery = (body, column) => {
  body['order_by'] = `${sanitizeSpaces(column)} ASC`
  body['column_1'] = sanitizeSpaces(column)
  body['group_by'] = sanitizeSpaces(column)
  return body
}

const filterLinearParamsQuery = (body, column) => {
  body['subquery_aggregate'] = selectAggregateFunction('min')
  body['subquery_column'] = sanitizeSpaces(column)
  body['subquery_column_alias'] = `min`
  body['subquery_aggregate_2'] = selectAggregateFunction('max')
  body['subquery_column_2'] = sanitizeSpaces(column)
  body['subquery_column_alias_2'] = `max`
  return body
}


const prepareQuery = (payload, dataSetName) => {
  const body = {};
  body['dataset'] = `vpress_${dataSetName}`
  body['chart_type'] = payload.chart
  body['order_by'] = sanitizeSpaces(payload.xAxis.slug)
  if (payload.chart === 'scatter') {
    if (payload.xAxis.slug === 'total_count' || payload.yAxis.slug === 'total_count') {
      body['column_1'] = payload.xAxis.slug !== 'total_count'
        ? sanitizeSpaces(payload.xAxis.slug)
        : sanitizeSpaces(payload.yAxis.slug)
      body['order_by'] = sanitizeSpaces(body['column_1'])
      body['aggregate'] = 'COUNT'
      body['aggregate_column'] = '*'
      body['group_by'] = body['column_1']
    } else {
      body['column_1'] = sanitizeSpaces(payload.xAxis.slug)
      body['column_2'] = sanitizeSpaces(payload.yAxis.slug)
      body['group_by'] = `${body['column_1']}, ${body['column_2']}`
    }
    if (payload.xAxis.func && payload.xAxis.func && (payload.xAxis.func !== '' && payload.yAxis.func !== '')) {
      body['column_1'] = payload.groupBy.slug !== '' ? sanitizeSpaces(payload.groupBy.slug) : null
      body['group_by'] = payload.groupBy.slug !== '' ? sanitizeSpaces(payload.groupBy.slug) : null
      body['column_2'] = null
      body['subquery_aggregate'] = selectAggregateFunction(payload.xAxis.func)
      body['subquery_column'] = sanitizeSpaces(payload.xAxis.slug)
      body['subquery_aggregate_2'] = selectAggregateFunction(payload.yAxis.func)
      body['subquery_column_2'] = sanitizeSpaces(payload.yAxis.slug)
      body['order_by'] = `${sanitizeSpaces(body['subquery_column'])}, ${sanitizeSpaces(body['subquery_column_2'])}`

    } else {
      let aggregate
      let aggregate_column
      let column
      if (payload.xAxis.func && payload.xAxis.func !== '' ) {
        aggregate = selectAggregateFunction(payload.xAxis.func);
        aggregate_column = sanitizeSpaces(payload.xAxis.slug)
        column = sanitizeSpaces(payload.yAxis.slug)
        body['column_1'] = column
        body['column_2'] = null
        body['subquery_aggregate'] = aggregate
        body['subquery_column'] = aggregate_column
        body['group_by'] = column
      } else if (payload.yAxis.func && payload.yAxis.func !== '') {
        aggregate = selectAggregateFunction(payload.yAxis.func);
        aggregate_column = sanitizeSpaces(payload.yAxis.slug)
        column = sanitizeSpaces(payload.xAxis.slug)
        body['column_1'] = column
        body['column_2'] = null
        body['subquery_aggregate'] = aggregate
        body['subquery_column'] = aggregate_column
        body['group_by'] = column
      }
    }
    if (payload.groupBy.slug !== '' &&  !(payload.xAxis.func && payload.xAxis.func)) {
      body['column_1'] += `, ${sanitizeSpaces(payload.groupBy.slug)}`
    }
  }
  if (payload.chart === 'heatmap' || payload.chart === 'spineplot') {
    body['column_1'] = sanitizeSpaces(payload.xAxis.slug)
    body['column_2'] = sanitizeSpaces(payload.yAxis.slug)
    body['group_by'] = `${sanitizeSpaces(payload.xAxis.slug)}, ${sanitizeSpaces(payload.yAxis.slug)}`
    if (payload.collapseBy.slug === 'total_count') {
      body['aggregate'] = 'COUNT'
      body['aggregate_column'] = '*'
    } else if (payload.collapseBy.slug !== '') {
      body['aggregate'] = selectAggregateFunction(payload.collapseBy.func)
      body['aggregate_column'] = sanitizeSpaces(payload.collapseBy.slug)
    }
  }
  if (payload.chart === 'bars' || payload.chart === 'timeline') {

    const column_1 = payload.xAxis.slug !== payload.collapseBy.slug
      ? payload.xAxis.slug
      : payload.yAxis.slug

    body['column_1'] = sanitizeSpaces(column_1)
    body['group_by'] = sanitizeSpaces(column_1)
    if (payload.collapseBy.slug === 'total_count') {
      body['aggregate'] = 'COUNT'
      body['aggregate_column'] = '*'
    } else if (payload.collapseBy.slug !== '') {
      body['subquery_aggregate'] = selectAggregateFunction(payload.collapseBy.func)
      body['subquery_column'] = sanitizeSpaces(payload.collapseBy.slug)
    }
    if (payload.groupBy.slug !== '') {
      body['column_2'] = sanitizeSpaces(payload.groupBy.slug)
      body['group_by'] = `${sanitizeSpaces(column_1)}, ${sanitizeSpaces(payload.groupBy.slug)}`
    }
  }

  if (payload.filters.length > 0) {
    body['where'] = payload.filters.map(clause => {
      return {
        op: clause.type !== 'ordinal' && clause.value.length === 2
          ? 'BETWEEN'
          : 'IN',
        column: sanitizeSpaces(clause.slug),
        value: clause.value
      }
    })
  }

  body['order_by'] = `${
    payload.orderBy.slug === ''
      ? body['order_by']
      : sanitizeSpaces(payload.orderBy.slug)
    } ${payload.orderBy.order.toUpperCase()}`
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
    ? '`'+columnName+'`'
    : columnName
}

export default {
  merge,
  invertAxis,
  sortByDataType,
  extractDateFormat,
  filterOrdinalParamsQuery,
  filterLinearParamsQuery,
  prepareQuery
};

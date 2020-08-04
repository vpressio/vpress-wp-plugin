import * as _ from 'lodash';
import * as d3 from 'd3';
import VpressError from './vpressError';

const queryByChart =  (chartValues, { newValue, mergeType } ) => {
  try {
    const payload = {
      chartValues,
      mutationType: mergeType,
      newValue: newValue
    }
    const callback = {
      filter: setFilters,
      orderBy: setOrder,
      collapseBy: ({ chartValues, mutationType, newValue }) => {
        if (newValue.type === 'linear') {
          chartValues[mutationType] = newValue;
        }
        return chartValues
      },
      groupBy: ({chartValues, mutationType, newValue}) => {
        if (newValue.type !== 'linear') {
          chartValues[mutationType] =
            chartValues.xAxis.slug === chartValues.groupBy.slug ||
            chartValues.yAxis.slug === chartValues.groupBy.slug
              ? { title: '', type: '', slug: '' }
              : newValue
        }
        return chartValues
      },
      xAxis: setAxisByChart,
      yAxis: setAxisByChart,
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
          throw new VpressError( mutationType , 'Selección de variables no compatible con la gráfica.');
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
        break;
      
      case 'spineplot':
        if (mainAxis.type === 'linear' && oppAxis.type === 'linear') {
          throw new VpressError( mutationType , 'Selección de variables no compatible con la gráfica.');
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
          throw new VpressError( mutationType , 'Selección de variables no compatible con la gráfica.');
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
    console.log(chartValues);
    return chartValues
  } catch (error) {
    throw new VpressError( mutationType , error.message);
  }
  
}

const mergeChartVal =  (chartValues, { newValue, mutationType }) => {
  try {
      const payload = {
        chartValues,
        mutationType: mutationType,
        newValue: newValue
      }
    return setValue(payload)
    
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
    throw new VpressError( _ , error.message);
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
    throw new VpressError( _ , error.message);
  }
}

const invertAxis =  ({ chartValues }) => {
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

// const removeAggregate =  ({chartValues, newValue, mutationType}) => {
//   try {
//     switch (chartValues.chart) {
//       case 'bars':
//         chartValues.groupBy = newValue
//         break
//         case 'heatmap':
//           chartValues.collapseBy = newValue
//           break
//         case 'spineplot':
//           chartValues.collapseBy = newValue
//           break
//         case 'scatter':
//           chartValues.collapseBy = newValue
//           chartValues.groupBy = newValue
//           break
//         case 'timeline':
//           chartValues.collapseBy = newValue
//           chartValues.groupBy = newValue
//         break
//       default:
//         throw new VpressError(mutationType,'Invalid chart type');
//     }
//     return chartValues;
//   } catch (error) {
//     throw new VpressError(error.value, error.message)
//   }
// }

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

const extractDataType = (dataSample) => {
  const dateFormats = ['%Y/%m/%d','%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'];
  const dataSampleEntries = Object.entries(dataSample);
  let dateFormat = null
  const variables = dataSampleEntries
    .map(sampleValue => {
      const dataType = dateFormats.reduce((acc, format) => {
        if (d3.timeParse(dateFormat)(sampleValue[1]) !== null) {
          acc.type = 'date';
          dateFormat = format;
        }
        if (isNaN(+sampleValue[1]) && acc.format === undefined) {
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

const queryBody = (payload, table_name) => {
  const body = {}
  body['dataset'] = `vpress_${table_name}`
  body['chart_type'] = payload.chart
  

  if (payload.xAxis.type === 'linear' && payload.yAxis.type === 'linear') {
    if (payload.xAxis.slug !== '') {
     body['linear_column_1'] = `${sanitizeSpaces(payload.xAxis.slug)}`
    }
    if (payload.yAxis.slug !== '') {
      body['linear_column_2'] = `${sanitizeSpaces(payload.yAxis.slug)}`
      
    }
    if (payload.groupBy.slug !== '') {
      body['linear_column_3'] = `${sanitizeSpaces(payload.groupBy.slug)}`
    }
    if (payload.collapseBy.slug !== '') {
      body['linear_column_4'] = `${sanitizeSpaces(payload.collapseBy.slug)}`
    }
  }


  if (
    (payload.xAxis.type === 'linear' && payload.yAxis.type !== 'linear') ||
    (payload.yAxis.type === 'linear' && payload.xAxis.type !== 'linear')
  ) {
    if (payload.xAxis.slug !== '') {
      if (payload.xAxis.type === 'linear') {
        body['aggregate_1'] = selectAggregateFunction(payload.xAxis.func)
        body['aggregate_column_1'] = `${sanitizeSpaces(payload.xAxis.slug)}`
      } else if (payload.xAxis.slug === 'total_count') {
        body['aggregate_1'] = 'COUNT'
        body['aggregate_column_1'] = '*'
      } else {
        body['column_1'] = `${sanitizeSpaces(payload.xAxis.slug)}`
      }
     }
     if (payload.yAxis.slug !== '') {
      if (payload.yAxis.type === 'linear') {
        body['aggregate_2'] = selectAggregateFunction(payload.yAxis.func)
        body['aggregate_column_2'] = `${sanitizeSpaces(payload.yAxis.slug)}`
      } else if (payload.yAxis.slug === 'total_count') {
        body['aggregate_2'] = 'COUNT'
        body['aggregate_column_2'] = '*'
      } else {
        body['column_2'] = `${sanitizeSpaces(payload.yAxis.slug)}`
      }
     }
    if (payload.groupBy.slug !== '') {
      body['column_2'] = `${sanitizeSpaces(payload.groupBy.slug)}`
    }
    if (payload.collapseBy.slug !== '' && (payload.chart !== 'bars' && payload.chart !== 'spineplot' && payload.chart !== 'timeline')) {
      if (payload.xAxis.slug === 'total_count') {
        body['aggregate_3'] = 'COUNT'
        body['aggregate_column_3'] = '*'
      } else {
        body['aggregate_3'] = selectAggregateFunction(payload.collapseBy.func)
        body['aggregate_column_3'] = `${sanitizeSpaces(payload.collapseBy.slug)}`
      }
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
  // body['order_by'] = `${
  //   payload.orderBy.slug === ''
  //     ? body['order_by']
  //     : sanitizeSpaces(payload.orderBy.slug)
  //   } ${payload.orderBy.order.toUpperCase()}`
  return body
}

const prepareQuery = (payload, table_name) => {
  const body = {};
  body['dataset'] = `vpress_${table_name}`
  body['chart_type'] = payload.chart
  body['order_by'] = sanitizeSpaces(payload.xAxis.slug)

  if (payload.chart === 'map') {
    body['column_1'] = sanitizeSpaces(payload.xAxis.slug)
    body['subquery_aggregate'] = selectAggregateFunction(payload.yAxis.func)
    body['subquery_column'] = sanitizeSpaces(payload.yAxis.slug)
    body['group_by'] = body['column_1']
  }
  if ( payload.chart === 'scatter') {
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
  queryByChart,
  mergeChartVal,
  invertAxis,
  extractDataType,
  filterOrdinalParamsQuery,
  filterLinearParamsQuery,
  prepareQuery,
  queryBody
};

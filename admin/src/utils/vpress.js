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
      switch (mutationType) {
        case 'xAxis':
          return await setAxis(payload)
        case 'yAxis':
          return await setAxis(payload)
        case 'aggregation':
          return await setAggregate(payload)
        case 'filter':
          return await setFilter(payload)
        default:
          throw new VpressError (
            mutationType,
            'Slot id must be a valid chart value: [ xAxis, yAxis, aggregation, filter ]'
          )
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

const invertAxis = async ({ chartValues }) => {
  try {
    const xAxis = { ...chartValues.xAxis };
    const yAxis = { ...chartValues.yAxis };

    chartValues.xAxis = yAxis;
    chartValues.yAxis = xAxis;
    switch (chartValues.chart) {
      case 'heatmap':
        if (chartValues.xAxis === 'linear') {
          chartValues.groupBy = yAxis
        } else {
          chartValues.groupBy = xAxis;
        }
        break
      case 'scatter':
        if (chartValues.yAxis === chartValues.groupBy) {
          chartValues.groupBy = chartValues.yAxis
        } else {
          chartValues.groupBy = chartValues.xAxis
        }
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
        // chartValues.orderBy.slug = newValue.slug;
        if (
          chartValues.xAxis.type === chartValues.yAxis.type
        ) {
          chartValues.chart =
            chartValues.collapseBy.slug === ''
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
        // chartValues.orderBy.slug = newValue.slug;
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
        // chartValues.collapseBy = { title: 'Conteo de observaciones', type: 'linear', slug: 'total_count', func: '' }
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

const setFilter = async ({ chartValues, newValue }) => {
  switch (newValue.type) {
    case 'ordinal':
      break;
    case 'linear':
      break;
    case 'date':
      break;
    case '':
      break
    default:
      throw new VpressError(newValue.title,'Invalid variable data type');
  }
  return chartValues;
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

export default {
  merge,
  invertAxis,
  sortByDataType,
  extractDateFormat
};

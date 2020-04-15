import * as _ from 'lodash';
import * as d3 from 'd3';
import VpressError from './vpressError';

const merge = async (chartConfig, newChartValue) => {
  try {
      const {
        title,
        type,
        slug,
        func
      } = newChartValue.body;
      
      const payload = {
        chartConfig,
        newValueName: newChartValue.name,
        newValue: {
          title: title,
          type: type,
          slug: slug,
          func: func
        }
      }
    try {
      switch (payload.newValueName) {
        case 'xAxis':
          return await changeAxis(payload, payload.newValueName)
        case 'yAxis':
          return await changeAxis(payload,payload.newValueName)
        case 'aggregation':
          return await changeAggregate(payload)
        case 'filter':
          return await changeFilter(payload)
        default:
          throw new VpressError (
            newChartValue.name,
            'Slot id must be a valid chart value: [ xAxis, yAxis, aggregation, filter ]'
          )
      }
    } catch (error) {

      if (error instanceof VpressError) {
        throw new VpressError (
            error.value,
            error.message
        )
      } else {
        throw new VpressError (
          newChartValue.name,
          error.message
        )
      }
    }
  } catch (error) {
    throw new VpressError (
      error.value,
      error.message
    )
  }
};

const changeAxis = async (payload) => {
  try {
    const {
      chartConfig,
      newValueName,
      newValue
    } = payload;

    chartConfig[newValueName] = newValue;

    if (
        !_.includes(
          [ chartConfig.xAxis.slug, chartConfig.yAxis.slug ],
          chartConfig.collapseBy.slug
        )
      ) {
        chartConfig.collapseBy = { title: '', type: 'linear', slug: '', func: ''};
      }
    switch (newValue.type) {
      case 'ordinal':
        chartConfig.orderBy.slug = newValue.slug;
        if (
          chartConfig.xAxis.type === chartConfig.yAxis.type
        ) {
          chartConfig.chart =
            chartConfig.collapseBy.slug === ''
            ? 'heatmap'
            : 'spineplot';
          chartConfig.groupBy = chartConfig.yAxis;
        } else if (
          chartConfig.xAxis.type === 'linear' ||
          chartConfig.yAxis.type === 'linear'
        ) {
          chartConfig.chart = 'bars';
          
          if (chartConfig.groupBy === chartConfig[newValueName]) {
            chartConfig.groupBy = { title: '', type: 'ordinal', slug: ''}
          }
          
          if (chartConfig.xAxis.type === 'linear') {
            chartConfig.collapseBy = chartConfig.xAxis
          } else if (chartConfig.yAxis.type === 'linear') {
            chartConfig.collapseBy = chartConfig.yAxis
          }
        } else if (
          chartConfig.xAxis.type === 'date' ||
          chartConfig.yAxis.type === 'date'
          ) {
            chartConfig.chart = chartConfig.collapseBy.slug === ''
            ? 'heatmap'
            : 'spineplot';
          if (chartConfig.xAxis.type === 'date') {
            chartConfig.groupBy = chartConfig.yAxis
          } else if (chartConfig.yAxis.type === 'date') {
            chartConfig.groupBy = chartConfig.yAxis
          }
        }
        break;
      case 'linear':
        chartConfig.orderBy.slug = newValue.slug;
        if (
          chartConfig.xAxis.type === newValue.type &&
          chartConfig.yAxis.type === newValue.type
        ) {
          chartConfig.chart = 'scatter'
          if (chartConfig.groupBy === chartConfig.xAxis) {
            chartConfig.groupBy = { title: '', type: 'ordinal', slug: ''}
          } else if ( chartConfig.groupBy === chartConfig.yAxis) {
            chartConfig.groupBy = { title: '', type: 'ordinal', slug: ''}
          }
        } else if (
          chartConfig.xAxis.type === 'ordinal' ||
          chartConfig.yAxis.type === 'ordinal'
        ) {
          chartConfig.chart = 'bars';
          
          if (chartConfig.groupBy === chartConfig.xAxis) {
            chartConfig.groupBy = { title: '', type: 'ordinal', slug: ''}
          } else if (chartConfig.groupBy === chartConfig.yAxis) {
            chartConfig.groupBy = { title: '', type: 'ordinal', slug: ''}
          }

          chartConfig.collapseBy = newValue
        } else if (
          chartConfig.xAxis.type === 'date' ||
          chartConfig.yAxis.type === 'date'
        ) {
          chartConfig.chart = 'timeline';
          chartConfig.collapseBy = newValue;
          chartConfig.groupBy = { title: '', type: 'ordinal', slug: '' };
        }
        break;
      case 'date':
        chartConfig.collapseBy = { title: 'Conteo de observaciones', type: 'linear', slug: 'total_count', func: '' }
        chartConfig.groupBy = { title: '', type: 'ordinal', slug: ''}
        if (
          chartConfig.xAxis.type === chartConfig.yAxis.type
        ) {
          chartConfig.chart = 'heatmap'
          chartConfig.collapseBy = { title: '', type: 'linear', slug: '', func: '' };
          chartConfig.groupBy = chartConfig.yAxis;
        }
        if (chartConfig[newValueName] === chartConfig.xAxis && chartConfig.yAxis.type === 'linear') {
          chartConfig.chart = 'timeline';
          chartConfig.collapseBy = chartConfig.yAxis;
        }
        if (chartConfig[newValueName] === chartConfig.yAxis && chartConfig.xAxis.type === 'linear') {
          chartConfig.chart = 'timeline';
          chartConfig.collapseBy = chartConfig.xAxis
        }
        break
      case '':
        break
      default:
        throw new VpressError(newValueName, 'Tipo de dato inválido.');
    }
    return chartConfig;

  } catch (error) {
    throw new VpressError(error.newValueName, error.message);
  }
};

const changeAggregate = async (payload) => {
  try {
    const {
      chartConfig,
      newValueName,
      newValue
  } = payload;

    if (newValue.slug === '') {
    return removeAggregate(payload);
  }
    
  switch (chartConfig.chart) {
    case 'bars':
      if (newValue.type === 'ordinal') {
        chartConfig.groupBy = newValue
      } else {
        throw new VpressError(newValueName,'Las gráficas de barra sólo pueden agruparse por una variable ordinal.')
      }
      break;
    case 'heatmap':
      if (newValue.type === 'linear') {
        chartConfig.collapseBy = newValue
      } else {
        throw new VpressError(newValueName, 'Los heatmap sólo pueden agruparse por una variable linear.')
      }
      break;
      case 'spineplot':
        if (newValue.type === 'linear') {
          chartConfig.collapseBy = newValue
        } else {
          throw new VpressError(newValueName, 'Los spineplot sólo pueden agruparse por una variable linear.')
        }
        break;
        case 'scatter':
          if (newValue.type === 'linear') {
            chartConfig.collapseBy = newValue
          } else if (newValue.type === 'ordinal') {
            chartConfig.groupBy = newValue
          }
      break;
    case 'timeline':
      if (newValue.type === 'ordinal') {
        chartConfig.groupBy = newValue
      } else {
        throw new VpressError( newValueName, 'Los timeline sólo pueden agruparse por una variable ordinal.')
      }
      break;
    default:
      throw new VpressError( newValueName, 'Invalid chart type');
  }
    return chartConfig;
  } catch (error) {
    throw new VpressError(error.newValueName, error.message);
  }
};

const changeFilter = async (payload) => {
  switch (payload.newValue.type) {
    case 'ordinal':
      break;
    case 'linear':
      break;
    case 'date':
      break;
    case '':
      break
    default:
      throw new Error('Invalid variable data type');
  }
  return payload.chartConfig;
};

const removeAggregate = async ({chartConfig, newValue, newValueName}) => {
  try {
    switch (chartConfig.chart) {
      case 'bars':
        chartConfig.groupBy = newValue
        break
        case 'heatmap':
          chartConfig.collapseBy = newValue
          break
        case 'spineplot':
          chartConfig.collapseBy = newValue
          break
        case 'scatter':
          chartConfig.collapseBy = newValue
          chartConfig.groupBy = newValue
          break
        case 'timeline':
          chartConfig.collapseBy = newValue
          chartConfig.groupBy = newValue
        break
      default:
        throw new VpressError(newValueName,'Invalid chart type');
    }
    return chartConfig;
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
  sortByDataType,
  extractDateFormat
};

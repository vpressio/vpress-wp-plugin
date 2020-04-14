import * as _ from 'lodash';
import * as d3 from 'd3';

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

    if (
      payload.newValueName === 'yAxis' ||
      payload.newValueName === 'xAxis'
    ) {
      return await changeAxis(payload)
    }
    if (payload.newValueName === 'aggregation') {
      return await changeAggregate(payload)
    }
    if (payload.newValueName === 'filter') {
      return await changeFilter(payload)
    }

    throw new Error('Slot id must be a valid chart value: [ xAxis, yAxis, aggregation, filter ]');
  } catch (error) {
    console.warn({ error: error, message: 'From merge' })
    return chartConfig;
  }
};

const validateDataType = (data) => {
  const dateFormats = ['%d/%m/%Y', '%Y-%d-%m'];
  const dataType = dateFormats.reduce(
    (acc, dateFormat) => {
      if (d3.timeParse(dateFormat)(data) !== null) {
        acc = 'date'
      }
      return acc;
    },
    'ordinal'
  )
  return dataType;
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
          console.log(chartConfig, newValueName)
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
        console.log(chartConfig, chartConfig[newValueName], newValue)
        break
      case '':
        console.warn('item removed')
        break
      default:
        throw new Error('Invalid variable data type');
    }
    return chartConfig;

  } catch (error) {
    console.warn({error: error, message: '"changeAxis" failed.'})
  }
};

const changeAggregate = async (payload) => {
  try {
    const {
    chartConfig,
    newValue
  } = payload;

    if (newValue.slug === '') {
    return removeAggregate(chartConfig, newValue);
  }
    
  switch (chartConfig.chart) {
    case 'bars':
      if (newValue.type === 'ordinal') {
        chartConfig.groupBy = newValue
      } else {
        throw new Error({message:'Las gráficas de barra sólo pueden agruparse por una variable ordinal.', chartConfig})
      }
      break;
    case 'heatmap':
      if (newValue.type === 'linear') {
        chartConfig.collapseBy = newValue
      } else {
        throw new Error({message: 'Los heatmap sólo pueden agruparse por una variable linear.', chartConfig: chartConfig})
      }
      break;
      case 'spineplot':
        if (newValue.type === 'linear') {
          chartConfig.collapseBy = newValue
        } else {
          throw new Error({message: 'Los spineplot sólo pueden agruparse por una variable linear.', chartConfig: chartConfig})
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
        throw new Error({message:'Los timeline sólo pueden agruparse por una variable ordinal.', chartConfig: chartConfig})
      }
      break;
    default:
      throw new Error('Invalid chart type');
  }
    return chartConfig;
  } catch (error) {
    console.warn(error)
    return error.chartConfig
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
      console.warn('item removed')
      break
    default:
      throw new Error('Invalid variable data type');
  }
  return payload.chartConfig;
};

const removeAggregate = async (chartConfig, newValue) => {
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
        throw new Error('Invalid chart type');
    }
    return chartConfig;
  } catch (error) {
    console.warn(error)
  }
}

export default {
  merge,
  validateDataType
};

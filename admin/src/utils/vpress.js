import * as _ from 'lodash';

const merge = async (chartConfig, newChartValue) => {
  try {
    const {
      variableName,
      variableNameDataType,
      func
    } = newChartValue.body;
    
    const payload = {
      chartConfig,
      newValueName: newChartValue.name,
      newValue: {
        title: variableName,
        type: variableNameDataType,
        slug: variableName,
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
        if (
          chartConfig.xAxis.type === newValue.type &&
          chartConfig.yAxis.type === newValue.type
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
        }
        break;
      case 'linear':
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
        }
        break;
      case 'date':
        if (
          chartConfig.xAxis.type === newValue.type &&
          chartConfig.yAxis.type === newValue.type
        ) {
          throw new Error('Date chart value type is found in more than one axis.')
        } else if (
          chartConfig.xAxis.type === newValue.type ||
          chartConfig.yAxis.type === newValue.type
        ) {
          chartConfig.chart = 'timeline'
        } 
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
  const {
    chartConfig,
    newValue
  } = payload;

  switch (newValue.type) {
    case 'ordinal':
      if (
        chartConfig.xAxis.slug !== newValue.slug ||
        chartConfig.yAxis.slug !== newValue.slug
      ) {
        chartConfig.groupBy = newValue
      }
      break;
    case 'linear':
      chartConfig.collapseBy = newValue
      break;
    case 'date':
      break;
    case '':
      return removeAggregate(chartConfig, newValue);
    default:
      throw new Error('Invalid variable data type');
  }
  return chartConfig;
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
  merge
};

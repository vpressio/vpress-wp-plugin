import { defineStore } from 'pinia';
import { Dataset } from '../models/index.js';
import vpress from '../vpress/index.js';
import api from '../utils/axios.js';

export const useWorkspaceStore = defineStore('workspace', {
  state: () => ({
    datasetMeta: {},
    activeDataset: null
  }),
  getters: {
    // Vuex getter was named `activeDataset` (collides with state in Pinia) —
    // renamed to `activeDatasetMeta`: resolves the slug to its Dataset object.
    activeDatasetMeta(state) {
      return state.activeDataset ? state.datasetMeta[state.activeDataset] : null;
    },
    dataType() {
      return this.activeDatasetMeta ? this.activeDatasetMeta.variables : [];
    },
    dateFormat() {
      return this.activeDatasetMeta ? this.activeDatasetMeta.dateFormat : '';
    },
    dataSetName() {
      return this.activeDatasetMeta ? this.activeDatasetMeta.name : '';
    }
  },
  actions: {
    async ADD_DATASET(payload) {
      try {
        const { data } = await api.dataset.data({
          page: 1,
          dataset: payload.slug,
          itemsPerPage: 1
        });
        let datasetVariables, datasetDateFormat;

        if (data.data && data.data.length > 0) {
          const { variables, dateFormat } = vpress.extractDataType(data.data[0]);
          datasetVariables = variables;
          datasetDateFormat = dateFormat;
        } else {
          datasetVariables = [];
          datasetDateFormat = '';
        }

        const dataset = new Dataset(
          payload.id,
          payload.name,
          payload.slug,
          payload.description,
          payload.owner_id,
          payload.permissions,
          payload.source,
          payload.tag,
          datasetVariables,
          datasetDateFormat,
          payload.rows,
          payload.size
        );

        if (data.error) {
          throw new Error(data.error);
        }
        // Vuex ADD_DATASET_META mutation: reset then register (omits stale workspaces).
        this.datasetMeta = { [dataset.slug]: dataset };
        return dataset;
      } catch (error) {
        throw new Error(error.message);
      }
    },
    REMOVE_DATASET() {
      delete this.datasetMeta[this.activeDataset];
      const datasets = Object.values(this.datasetMeta);
      if (datasets.length > 0) {
        this.UPDATE_ACTIVE_DATASET(datasets[0].slug);
        return datasets[0];
      } else {
        this.UPDATE_ACTIVE_DATASET(null);
        return {};
      }
    },
    UPDATE_ACTIVE_DATASET(dataset) {
      this.activeDataset = dataset;
    }
  }
});

<template>
<div class="vpress-navigator">
  <div class="vpress-app-bar">
    <VpressAppBar/>
  </div>
  <v-card
    class="vpress-sidebar"
    tile
    flat
    color="#222A32"
  >
    <v-card 
      class="pa-2"
      tile
      height="50"
      color="#181D25"
      flat
    >
      <v-img src="../assets/images/logo.svg" />
      <div class="my-4">
        <v-btn
          class="py-3 my-2"
          v-for="dataset in datasets"
          :key="dataset"
          x-small
          block
          :color="
            $store.getters['workspace/activeDataset'] &&
            $store.getters['workspace/activeDataset'].slug === dataset 
              ? 'secondary'
              : 'primary'
          "
          @click="selectDataset(dataset)"
        >
          <v-tooltip
            attach
            right
            offset-x
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                small
                v-bind="attrs"
                v-on="on"
              >
                mdi-database
              </v-icon>
            </template>
            <span> {{ dataset }} </span>
          </v-tooltip>
        </v-btn>
        <v-btn
          v-if="datasets.length > 0"
          class="py-3 my-2"
          x-small
          block
          color="primary"
          @click="addDataset"
        >
          <v-tooltip
            attach
            right
            offset-x
          >
            <template v-slot:activator="{ on, attrs }">
              <v-icon
                small
                v-bind="attrs"
                v-on="on"
              >
                mdi-plus
              </v-icon>
            </template>
            <span> Nuevo </span>
          </v-tooltip>
        </v-btn>
      </div>
    </v-card>
  </v-card>
  <div class='vpress-navigation-view'>
    <router-view :key="$route.path"/>
    <v-snackbar
      dark
      bottom
      right
      v-model="$store.state.notifications.show"
      :timeout="$store.state.notifications.timeout"
      :color="$store.state.notifications.color"
    >
      {{ $store.state.notifications.text }}
      <template v-slot:action="{ attrs }">
        <v-btn
          color="white"
          text
          v-bind="attrs"
          @click="snackbar = $store.dispatch('notifications/close')"
        >
          Cerrar
        </v-btn>
      </template>
    </v-snackbar>
    <v-tour
      name="vpress-tour"
      :steps="tourSteps"
      :options="tourOptions"
      :callbacks="tourCallbacks"
    />
  </div>
</div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue';

export default {
  name: 'Vpress',
  components: {
    VpressAppBar
  },
  data() {
    return {
      datasets: {},
      tourOptions: {
        useKeyboardNavigation: true,
        labels: {
          buttonSkip: 'Omitir tutorial',
          buttonPrevious: 'Anterior',
          buttonNext: 'Siguiente',
          buttonStop: 'Terminar'
        }
      },
      tourFile: {
        error: 'Hubo un problema con el tutorial.'
      },
      tourCallbacks: {
        onNextStep: this.tourNext
      },
      tourSteps: [
          {
            target: '.v-step-0',
            content: `Descubre lo que puedes hacer con Vpress`,
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-1',
            content: 'Prueba con datos que hemos preparado para ti',
            params: {
              placement: 'top'
            }
          },
          {
            target: '.v-step-2',
            content: 'Da click en siguiente para comenzar tu análisis',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-3',
            content: 'Hagamos una gráfica juntos',
            params: {
              placement: 'top'
            }
          },
          {
            target: '.v-step-4',
            content: 'Arrastra la observación "anillos" a la selección de Filas',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-5',
            content: 'Arrastra la observación "Conteo de observaciones" a la selección de Columnas',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-6',
            content: 'Hagamos algo más, arrastra la observación de "planeta" a la sección de Color',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-7',
            content: 'Nos separó la gráfica por "planeta" y nos agrega la opción de poder Apilar la gráfica',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-8',
            content: 'Dale estilo a tu gráfica cambiando colores',
            params: {
              placement: 'bottom'
            }
          },
          {
            target: '.v-step-9',
            content: 'Selecciona entre un color plano o una gama de color más amplia. ¡ Disfruta de Vpress !',
            params: {
              placement: 'right'
            }
          }
        ]
    }
  },
  created() {
    this.unsubscribe = this.$store.subscribe(
      mutation => {
        if(
          mutation.type === 'workspace/ADD_DATASET_META' ||
          mutation.type === 'workspace/REMOVE_DATASET_META'
        ) {
          this.datasets = Object.keys(this.$store.getters['workspace/datasetMeta'])
        }
      }
    )
  },
  // mounted() {
      // this.$tours['vpress-tour'].start();
  // },
  beforeDestroy() {
    this.unsubscribe();
  },
  methods: {
    async selectDataset(dataset) {
      this.$store.dispatch('workspace/UPDATE_ACTIVE_DATASET', dataset)
    },
    async addDataset() {
      await this.$store
          .dispatch(
            'workspace/UPDATE_ACTIVE_DATASET',
            null
          )
    },
    mergeValue(slot, dataToMerge) {
      this.$store.dispatch(
        `editor/DATA_QUERY`,
        { value: dataToMerge, mutationType: slot}
      )
    },
    tourNext(currentStep) {
      switch(currentStep) {
        case 0:
          // this.$store.dispatch(
          //   'workspace/GET_DATASET_BY_NAME',
          //   { dataSetDir:tourFileDir, file: tourFileName }
          // )
          //   .then(file => this.tourFile = {
          //     file: file,
          //     fileName: tourFileName,
          //     fileDir: tourFileDir
          //     }
          //   )
          //   .catch(err => this.tourFile = { error: err })
          break
        case 2:
          // this.activeTab = 1
          break
        case 3:
          // this.mergeValue(
          //   'xAxis',
          //   {
          //     slug: "anillos",
          //     title: "anillos",
          //     type: "ordinal"
          //   }
          // );
          break
        case 4:
          // this.mergeValue(
          //   'yAxis',
          //   {
          //     slug: "total_count",
          //     title: "Conteo de observaciones",
          //     type: "linear"
          //   }
          // );
          break
        case 5:
          // this.mergeValue(
          //   'aggregation',
          //   {
          //     slug: "planeta",
          //     title: "planeta",
          //     type: "ordinal"
          //   }
          // );
          break
        case 6:
          // this.$store.dispatch(
          //   'editor/MERGE_CHART_VALUE',
          //   { mutationType:'stackedBars', value: true }
          // );
          break
        case 7:
          // this.activeTab = 2
          break
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.vpress-navigator {
  display: grid;
  height:100%;
  grid-template-columns: 45px 1fr;
  grid-template-rows: 45px 1fr;
}

.vpress-app-bar {
  grid-area: 1/1/2/3;
}

.vpress-navigation-view {
  grid-area: 2/2;
}
.vpress-sidebar {
  grid-area: 2/1/2/2;
}
.beta-banner-container {
  position: absolute;
  z-index: 3;
  margin-left: calc(100% - 100px);
  display: flex;
  justify-content: flex-end;
}

.beta-banner {
  width: 100px
}

.v-input input {
  border: none;
}
.v-snack:not(.v-snack--absolute) {
  z-index: 99999 !important;
}
</style>

<template>
  <div class="vpress-navigator">
    <div class="vpress-app-bar">
      <VpressAppBar/>
    </div>
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
      <!-- <v-tour
        name="vpress-tour"
        :steps="tourSteps"
        :options="tourOptions"
        :callbacks="tourCallbacks"
      /> -->
    </div>
  </div>
</template>
<script>
import VpressAppBar from '../components/vpress-app-bar.vue';
import { editorMixin, loaderMixin } from '../mixins/index.js'

export default {
  name: 'Vpress',
  components: {
    VpressAppBar
  },
  mixins: [editorMixin, loaderMixin],
  data() {
    return {
      datasets: [],
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
  mounted() {
    // this.$tours['vpress-tour'].start();
    this.datasets = Object.keys(this.$store.getters['workspace/datasetMeta'])
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
  beforeDestroy() {
    this.unsubscribe();
  },
  methods: {
    async selectDataset(dataset) {
      this.updateActiveDataset( dataset)
    },
    async addDataset() {
      await this.updateActiveDataset(null)
    },
    async mergeValue(slot, dataToMerge) {
      try {
        await this.merge_query(dataToMerge, slot)
      } catch (error) {
        throw new Error(error)
      }
    },
    tourNext(currentStep) {
      switch(currentStep) {
        case 0:
          break
        
      }
    }
  }
}
</script>
<style lang="scss" scoped>
.vpress-navigator {
  width:100%;
  height:100%;
}

.vpress-app-bar {
  height: 48px;
  width: 100%
}

.vpress-navigation-view {
  width: 100%;
  height:calc(100% - 48px);
  background-color:#F8F8F8;
}

.v-input input {
  border: none;
}

.v-snack:not(.v-snack--absolute) {
  z-index: 99999 !important;
}
</style>

<template>
  <div :style="cssProps">
    <v-card v-show="error" class="errorMsgContainer">
      <div style="display:flex">
        <v-card
          class="mr-2"
          dark
          flat
          tile
          color="warning1"
        >
          <v-icon>
            mdi-alert-outline
          </v-icon>
        </v-card>
        <div class="py-2">
          <h4>Aviso</h4>
          <div class="errorMsg">
            {{ errorMessage }}
          </div>
        </div>
        <!-- <v-btn x-small text @click="closeErrorMsg">
          <v-icon>
            mdi-close
          </v-icon>
        </v-btn> -->
      </div>
    </v-card>
    <v-card
      class="py-1 pl-2 draggable-card"
      :class="{ 'pr-5': inSlot }"
      v-show="variable.type !== '' && variable.title !== ''"
      :draggable="draggable"
      @dragstart="dragStart"
      tile
      :color="error ? 'warning1' : '#322E71'"
      dark
    >
      <v-img
        :src="require('../assets/images/Puntos.svg')"
        width=10
        height="100%"
      />
      <div v-if="inSlot" class="operationButtonContainer">
        <v-menu
          attach
          close-on-click
          offset-x
          right
          nudge-right="15"
        >
          <template v-slot:activator="{ on }">
            <v-btn
              class="operationButton"
              v-on="on"
              small
              icon
              dark
            >
              <v-icon dense>mdi-dots-vertical</v-icon>
            </v-btn>
          </template>
          <v-list>
            <div
              v-if="
                variable.type === 'linear' &&
                variable.slug !== 'total_count' &&
                mutationType !== 'filter'
              "
            >
              <v-list-item
                class="px-5"
                v-for="(func, funcIndex) in funcs"
                :key="`func_${funcIndex}`"
                @click="selectFunc(func)"
                :class="{ 'selected-func': selectedFunc === func }"
              >
                <v-list-item-title
                  class="func-menu"
                  :class="{ 'selected-func': selectedFunc === func }"
                  :dark="selectedFunc === func"
                >
                  {{ func.name }}
                </v-list-item-title>
              </v-list-item>
              <v-divider/>
            </div>
            <v-list-item class="px-5" @click="removeCard">
              <v-list-item-title class="func-menu">
                Eliminar
              </v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <div
        class="dataTypeTitle py-1 pl-3 pr-5"
        :class="{'warning-text-color': error }"
      >
        <span
          v-if="variable.slug !== 'total_count'"
          class="ma-0"
        >
          {{ variableFunc }}
        </span>
        <span
          v-if="variable.slug === 'total_count'"
          class="vpress-default-card"
        >
          • {{ variable.title }}
        </span>
        <br>
        <span
          v-if="inSlot"
          class="variableCardDataType mb-0"
          :class="{'warning-text-color': error }"
        >
          {{ this.variable.type }}
        </span>
      </div>
    </v-card>
  </div>
</template>
<script>
import { editorMixin } from '../mixins/index.js'

export default {
  name: 'VpressVariableCard',
  mixins: [editorMixin],
  props: {
    mutationType: String,
    variable: Object,
    inSlot: Boolean,
    error: Boolean,
    errorMsg: String,
  },
  data() {
    return {
      showErrorMsg: false,
      draggable: true,
      funcs: [
        { type: 'sum', name: 'Suma' },
        { type: 'mean', name: 'Promedio' },
        { type: 'min', name: 'Mínimo' },
        { type: 'max', name: 'Máximo' },
        { type: '', name: 'Valor por defecto' }
      ],
      selectedFunc: { type: '', name: '' }
    };
  },
  computed: {
    errorMessage() {
      return this.errorMsg
    },
    variableFunc() {
      return (
        this.variable.func &&
        this.variable.type === 'linear' &&
        this.variable.func !== '' &&
        this.variable.slug !== 'total_count'
      )
        ? `${this.variable.title} (${this.variable.func.toUpperCase() || ''})`
        : `${this.variable.title}`
    },
    cssProps() {
      return {
        '--warning2': this.$vuetify.theme.themes.light.warning2,
      }
    },
  },
  methods: {
    closeErrorMsg () {
      this.showErrorMsg = false
    },
    dragStart(e) {
      const { dataTransfer } = e;
      const payload = JSON.stringify(this.variable);
      dataTransfer.setData('variableJson', payload);
    },
    async selectFunc(func) {
      try {
        this.variable.func = func.type
        this.selectedFunc = func
        await this.merge_query(
          this.variable,
          this.mutationType
        )
      } catch (error) {
        throw new Error(error.message)
      }
    },
    async removeCard() {
      try {
        const payload = this.mutationType === 'filter'
        ? {
            title: this.variable.title,
            type: this.variable.type,
            slug: this.variable.slug,
            value: 'remove'
          }
        : {
            title: '',
            type: '',
            slug: '',
            func: ''
          }
        await this.merge_query(
          payload,
          this.mutationType,
        )
      } catch (error) {
        throw new Error(error.message)
      }

    }
  }
};
</script>
<style scoped>
.draggable-card:hover {
  background-color: #757692 !important
}
.draggable-card {
  cursor: grab;
  display: flex;
  align-items: center;
}

.dataTypeTitle {
  font-weight: 700;
  font-size: 0.8rem;
  text-overflow: ellipsis;
  overflow: hidden;
  width: 100%;
  white-space: nowrap;
  height: 100%;
}

.warning-text-color {
  color: var(--warning2) !important
}

.dataTypeContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-end;
}

.removeButtonContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  z-index: -1;
}

.variableCardDataType {
  font-size: 12px;
  font-weight: 500;
  color: #cfcfcf;
}

.errorMsgContainer {
  position: absolute;
  margin-left: 100%;
  z-index: 5;
  min-height: 60px;
  flex-wrap: wrap;
  width: 130%
}

.errorMsg {
  font-size: 0.9 rem;
  line-height: 1.3;
}

.operationButtonContainer {
  position: absolute;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  z-index: 2;
}

.func-menu {
  color: #8c8282;
  margin: 0 15px 0 15px;
}

.selected-func {
  background-color: #7972ac;
  color: #fff;
}

.removeIcon {
  margin-bottom: auto;
}

.operationButton {
  background-color: transparent;
}

.vpress-default-card {
  font-style: italic;
}
</style>

<template>
  <div class="annotations-panel">
    <div class="pa-3">
      <div class="annotations-hint mb-2">
        Marca lo que importa: una línea de referencia, un punto destacado,
        un rango o una nota libre.
      </div>
      <div class="annotations-add">
        <v-btn
          v-for="type in types"
          :key="type.value"
          size="x-small"
          variant="outlined"
          color="primary"
          class="ma-1"
          :disabled="atCap"
          @click="addAnnotation(type.value)"
        >
          <v-icon
            start
            size="x-small"
          >
            {{ type.icon }}
          </v-icon>
          {{ type.title }}
        </v-btn>
      </div>
      <div
        v-if="atCap"
        class="annotations-cap mt-2"
      >
        Máximo {{ max }} anotaciones por gráfica.
      </div>
    </div>

    <v-divider />

    <div
      v-if="!annotations.length"
      class="pa-3 annotations-empty"
    >
      Esta gráfica aún no tiene anotaciones.
    </div>

    <div
      v-for="annotation in annotations"
      :key="annotation.id"
      class="annotation-row pa-3"
    >
      <div class="annotation-head">
        <span class="annotation-kind">{{ titleFor(annotation.type) }}</span>
        <span class="annotation-id">{{ annotation.id }}</span>
        <v-spacer />
        <v-btn
          icon
          variant="text"
          size="x-small"
          :aria-label="`Eliminar anotación ${annotation.id}`"
          @click="removeAnnotation(annotation.id)"
        >
          <v-icon size="small">
            mdi-delete-outline
          </v-icon>
        </v-btn>
      </div>

      <v-text-field
        :model-value="annotation.label"
        label="Etiqueta"
        density="compact"
        variant="underlined"
        hide-details
        class="mb-2"
        @change="updateField(annotation.id, 'label', $event.target.value)"
      />

      <v-select
        v-if="hasAxis(annotation.type)"
        :model-value="annotation.axis"
        :items="axes"
        label="Eje"
        density="compact"
        variant="underlined"
        hide-details
        class="mb-2"
        @update:model-value="updateField(annotation.id, 'axis', $event)"
      />

      <v-text-field
        v-for="key in positionKeys(annotation.type)"
        :key="key"
        :model-value="annotation[key]"
        :label="fieldLabel(annotation.type, key)"
        density="compact"
        variant="underlined"
        hide-details
        class="mb-2"
        @change="updateField(annotation.id, key, $event.target.value)"
      />

      <v-select
        :model-value="colorOf(annotation)"
        :items="colors"
        label="Color"
        density="compact"
        variant="underlined"
        hide-details
        @update:model-value="updateField(annotation.id, 'color', $event)"
      />
    </div>
  </div>
</template>
<script>
import { editorMixin } from '../mixins/index.js'
import {
  ANNOTATION_MAX,
  annotationColor,
  annotationHasAxis,
  annotationPositionKeys,
  createAnnotation
} from '../charts/annotations.js'

/** Spanish labels for the model's English tokens. */
const TYPES = [
  { value: 'line', title: 'Línea', icon: 'mdi-minus' },
  { value: 'point', title: 'Punto', icon: 'mdi-circle-small' },
  { value: 'range', title: 'Rango', icon: 'mdi-arrow-left-right' },
  { value: 'text', title: 'Nota', icon: 'mdi-format-text' }
]

const FIELD_LABELS = {
  value: 'Valor',
  from: 'Desde',
  to: 'Hasta',
  x: 'Posición X',
  y: 'Posición Y'
}

/**
 * A typed position, as a number when it reads as one.
 *
 * Positions are data-space values: a category on an ordinal axis stays a
 * string ("Oct"), a value on a linear axis becomes a number, and the server
 * keeps whichever type it is handed.
 */
export function typedPosition(raw) {
  const text = String(raw === null || raw === undefined ? '' : raw).trim()
  if (text === '' || !Number.isFinite(Number(text))) return String(raw ?? '')
  return Number(text)
}

export default {
  name: 'VpressConfigAnnotations',
  mixins: [editorMixin],
  data() {
    return {
      types: TYPES,
      max: ANNOTATION_MAX,
      axes: [
        { value: 'x', title: 'Eje X' },
        { value: 'y', title: 'Eje Y' }
      ],
      colors: [
        { value: 'signal', title: 'Señal' },
        { value: 'muted', title: 'Tenue' },
        { value: 'series', title: 'Serie' }
      ],
      // Ids are never reused, so the next one issued is tracked here rather
      // than derived from the surviving annotations: deleting the last one
      // must not hand its id back to the next annotation added, or a story
      // step pointing at it would silently rebind to different content.
      idFloor: 1
    }
  },
  computed: {
    annotations() {
      const list = this.editorStore.chart.annotations
      return Array.isArray(list) ? list : []
    },
    atCap() {
      return this.annotations.length >= ANNOTATION_MAX
    }
  },
  methods: {
    titleFor(type) {
      const found = TYPES.find((entry) => entry.value === type)
      return found ? found.title : type
    },
    fieldLabel(type, key) {
      return FIELD_LABELS[key] || key
    },
    hasAxis: annotationHasAxis,
    positionKeys: annotationPositionKeys,
    colorOf: annotationColor,
    /** Raise the floor past `id`, so that number is never issued again. */
    retire(id) {
      const match = /^a(\d+)$/.exec(String(id || ''))
      if (match) this.idFloor = Math.max(this.idFloor, Number(match[1]) + 1)
    },
    /**
     * Hand the whole array to the editor store, the way every other panel
     * writes config — never a mutation of the array in place, which would
     * also mutate the shared preset default.
     */
    commit(next) {
      return this.merge_value({ mutationType: 'annotations', value: next })
    },
    addAnnotation(type) {
      if (this.atCap) return null
      const created = createAnnotation(type, this.annotations, this.idFloor)
      this.retire(created.id)
      return this.commit([...this.annotations, created])
    },
    removeAnnotation(id) {
      // The surviving annotations keep their ids: they are identity, not
      // position, and a story references them by id.
      this.retire(id)
      return this.commit(this.annotations.filter((annotation) => annotation.id !== id))
    },
    updateField(id, key, value) {
      const next = this.annotations.map((annotation) => {
        if (annotation.id !== id) return annotation
        const updated = { ...annotation }
        updated[key] = key === 'label' || key === 'axis' || key === 'color' ? value : typedPosition(value)
        return updated
      })
      return this.commit(next)
    }
  }
}
</script>
<style scoped>
.annotations-hint,
.annotations-empty {
  font-size: 0.75rem;
  color: #737373;
}

.annotations-cap {
  font-size: 0.7rem;
  color: #b0173c;
}

.annotations-add {
  display: flex;
  flex-wrap: wrap;
}

.annotation-row + .annotation-row,
.annotation-row {
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.annotation-head {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
}

.annotation-kind {
  font-size: 0.75rem;
  font-weight: 700;
}

.annotation-id {
  font-size: 0.65rem;
  color: #999;
  font-family: monospace;
}
</style>

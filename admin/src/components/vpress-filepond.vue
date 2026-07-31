<template>
  <v-card
    class="pa-5 vpress-filepond"
    hover
    flat
    height="400"
    @drop.prevent.stop="dropFile"
    @dragover.prevent
  >
    <div v-show="showFilepond" class="filepond--width">
      <file-pond
        v-model="inPondFiles"
        :onremovefile="hideFilepond"
        :labelFileProcessingError="'Algo salió mal, vuelve a intentarlo.'"
        ref="pond"
        accepted-file-types="text/csv"
      />
      <v-label><span class="upload-hint">{{ fileTypeDynamicMessage }}</span></v-label>
    </div>
    <div v-show="!showFilepond" class="vpress-filepond--content">
      <v-card-title class="vpress-filepond--instruction">
        Arrastra y suelta tus datos
      </v-card-title>
      <v-btn
        class="my-5"
        rounded
        color="primary"
        max-width="180"
        height="50"
        @click="activateFileInput"
      >
        <v-icon class="icon-upload" start>mdi-file-upload-outline</v-icon>
        Subir datos
      </v-btn>
      <input v-show="false" type="file" ref="fileInput" id="fileInput" accept="text/csv" @input="fileInputAction" />
      <!-- v3's v-label is a flex container: bare text + <br> collapse onto one
           line; a single block child restores normal text flow. -->
      <v-label>
        <span class="upload-hint">
          Formatos permitidos: <strong>CSV</strong>
          <br />
          Tamaño máximo de archivo: <strong>{{ php_vars.upload_max_filesize }}</strong>
        </span>
      </v-label>
    </div>
    <v-dialog
      v-model="loading"
      persistent
      width="300"
    >
      <v-card
        color="primary"
        theme="dark"
      >
        <v-card-text>
          <v-card-title class="px-0 text-subtitle-1">
            {{ progress.phase === 'upload' ? 'Subiendo archivo…' : 'Importando datos…' }}
          </v-card-title>
          <v-progress-linear
            :model-value="progress.pct"
            color="white"
            height="8"
            class="mb-2"
          ></v-progress-linear>
          <div v-if="progress.phase === 'import'" class="text-caption">
            {{ new Intl.NumberFormat().format(progress.rowsInserted) }} filas importadas
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>
<script>
import { mapStores } from 'pinia'
import api from '../utils/axios'
import { runImport, abortImport } from '../utils/importPipeline.js'
import { useNotificationsStore } from '../store/index.js'
import vueFilePond from 'vue-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

export default {
  name: 'VpressFileDrop',
  components: {
    FilePond: vueFilePond(FilePondPluginFileValidateType)
  },
  props: ['file'],
  emits: ['uploaded'],
  data() {
    return {
      loading: false,
      progress: { phase: 'upload', pct: 0, rowsInserted: 0 },
      inPondFiles: [],
      showFilepond: false,
      fileTypeMessage: ''
    };
  },
  computed: {
    ...mapStores(useNotificationsStore),
    fileTypeDynamicMessage() {
      return this.fileTypeMessage;
    },
    php_vars() {
      // eslint-disable-next-line no-undef
      return php_vars;
    }
  },
  methods: {
    async handleFile(file) {
      const cap = (window.vpressImportConfig || {}).maxUploadBytes || 20 * 1024 * 1024;
      if (file.size > cap) {
        this.notificationsStore.open({
          color: 'warning',
          text: `El archivo excede el máximo de ${Math.round(cap / 1048576)} MB.`
        });
        return;
      }
      this.loading = true
      this.progress = { phase: 'upload', pct: 0, rowsInserted: 0 };
      try {
        const result = await runImport(file, {
          onProgress: (p) => { this.progress = p; }
        });
        const createRes = await api.dataset.create({
          name: result.datasetName,
          slug: result.datasetName,
          permissions: "public",
          owner_id: window.userSettings.uid
        })
        this.notificationsStore.open({
          color: 'success',
          text: 'Dataset guardado con éxito'
        })
        this.$emit('uploaded', createRes.data.data[0]);
        this.loading = false
      } catch (error) {
        if (error.sessionId) abortImport(error.sessionId);
        this.notificationsStore.open({
          color: 'error',
          text: error.status ? error.message : 'Hubo un error al intentar guardar el dataset'
        })
        if (this.$refs.fileInput) this.$refs.fileInput.value = '';
        this.loading = false
      }
    },
    activateFileInput() {
      this.$refs.fileInput.click();
    },
    fileInputAction(e) {
      const { target } = e;
      this.handleFile(target.files[0]);
    },
    dropFile(e) {
      const { dataTransfer } = e;
      this.handleFile(dataTransfer.files[0]);
    },
    hideFilepond() {
      this.showFilepond = false;
    }
  }
};
</script>

<style lang="scss" scoped>
.vpress-filepond {
  border: dashed #c3c3c3 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-top-left-radius: 30px !important ;
  border-top-right-radius: 30px !important;
  border-bottom-right-radius: 30px !important;
  border-bottom-left-radius: 30px !important;
}
.vpress-filepond--content {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.vpress-filepond--instruction {
  font-size: 1.8rem;
  color: #42454c;
  font-weight: 600;
  padding-bottom: 0px;
}
.icon-upload {
  font-size: 25px;
  padding-left: 21px;
  padding-right: 10px;
}
.filepond--width {
  width: 80%;
}
.upload-hint {
  display: block;
  text-align: center;
}
</style>

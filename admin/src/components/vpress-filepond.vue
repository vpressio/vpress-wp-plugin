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
      <v-label>{{ fileTypeDynamicMessage }}</v-label>
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
      <v-label>
        Formatos permitidos: <strong>CSV</strong>
        <br />
        Tamaño máximo de archivo: <strong>{{ php_vars.upload_max_filesize }}</strong>
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
            Subiendo, por favor espera
          </v-card-title>
          <v-progress-linear
            indeterminate
            color="white"
            class="mb-0"
          ></v-progress-linear>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-card>
</template>
<script>
import { mapStores } from 'pinia'
import api from '../utils/axios'
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
      this.loading = true
      let formData = new FormData();
      formData.append('file', file);
      try {
        const uploadRes = await api.dataset.upload(
          formData
        )
        const createRes = await api.dataset.create({
          name: uploadRes.data.data,
          slug: uploadRes.data.data,
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
        this.notificationsStore.open({
          color: 'error',
          text: 'Hubo un error al intentar guardar el dataset'
        })
        this.$refs.fileInput.value = '';
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
</style>

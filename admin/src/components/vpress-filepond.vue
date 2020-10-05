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
      <FilePond
        v-model="inPondFiles"
        :onremovefile="hideFilepond"
        :labelFileProcessingError="'Algo salió mal, vuelve a intentarlo.'"
        ref="pond"
        accepted-file-types="
          text/csv,
          application/vnd.ms-excel,
          application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
        "
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
        <v-icon class="icon-upload" left>mdi-file-upload-outline</v-icon>
        Subir datos
      </v-btn>
      <input v-show="false" type="file" ref="fileInput" id="fileInput" @input="fileInputAction" />
      <v-label>
        Formatos permitidos - csv
      </v-label>
    </div>
  </v-card>
</template>
<script>
import api from '../helpers/axios'
import vueFilePond from 'vue-filepond';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type/dist/filepond-plugin-file-validate-type.esm';
import 'filepond/dist/filepond.min.css';

export default {
  name: 'VpressFileDrop',
  components: {
    FilePond: vueFilePond(FilePondPluginFileValidateType)
  },
  props: ['file'],
  data() {
    return {
      inPondFiles: [],
      showFilepond: false,
      fileTypeMessage: ''
    };
  },
  computed: {
    fileTypeDynamicMessage() {
      return this.fileTypeMessage;
    }
  },
  methods: {
    async handleFile(file) {
      let formData = new FormData();
      formData.append('file', file);
      try {
        const uploadRes = await api.dataset.upload(
          formData
        )
        if (uploadRes.data.error) {
          throw new Error(uploadRes.data.error);
        }
        const createRes = await api.dataset.create({
          name: uploadRes.data.data,
          slug: uploadRes.data.data,
          permissions: "public",
          owner_id: window.userSettings.uid
        })
        if (createRes.data.error) {
          throw new Error(createRes.data.error);
        }
        this.$emit('update:file', uploadRes.data.data);
        this.$store.dispatch('notifications/open', {
          color: 'success',
          text: 'Dataset guardado con éxito'
        })
      } catch (error) {
        this.$store.dispatch('notifications/open', {
          color: 'error',
          text: 'Hubo un error al intentar guardar el dataset'
        })
        this.showFilepond = true;
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
  border: dashed #c3c3c3;
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

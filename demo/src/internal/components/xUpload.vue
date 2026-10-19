<template>
  <div class="upload-wrap">
    <div v-if="title" class="attachment-title">{{ title }}</div>
    <div v-if="!readonly && !hideTip" class="upload-tip">
      Upload file (JPG/PNG/JPEG/PDF/DOC/DOCX/XLS/XLSX)
    </div>
    <div class="file-list">
      <slot>
        <div v-if="!readonly && curFileNum < props.numLimit" class="file-item">
          <el-upload
            class="upload-body"
            :multiple="multiple"
            action
            :before-upload="beforeUpload"
            :http-request="fileChange"
            :accept="accept"
            :show-file-list="false"
          >
            <div class="upload-box"></div>
          </el-upload>
        </div>
        <div v-for="(item, index) in fileInfoDTOS" v-show="!item.delFlag" :key="item.fileId">
          <el-tooltip effect="light" :content="item.fileName" placement="top-start">
            <div class="file-item">
              <template v-if="!readonly">
                <el-image
                  v-if="showImageUrl(item.fileId) || preview === 'blank'"
                  class="img image-icon"
                  :src="imageUrl(item)"
                  fit="contain"
                  :lazy="lazy"
                />
                <el-image
                  v-if="!showImageUrl(item.fileId) && preview === 'self'"
                  class="img"
                  :src="item.fileUrl"
                  :zoom-rate="1.2"
                  :max-scale="7"
                  :min-scale="0.2"
                  :preview-src-list="[item.fileUrl]"
                  :initial-index="0"
                  fit="contain"
                  :lazy="lazy"
                />
                <div class="handle-icon-bg"></div>
                <div class="handle-icon-wrap">
                  <span
                    v-if="showView(item.fileId)"
                    class="file-view handle-icon"
                    @click="handlePreview(item)"
                  ></span>
                  <!-- <span class="file-view handle-icon" v-if="preview === 'self'"></span> -->
                  <span class="file-delete handle-icon" @click="handleRemove(item, index)"></span>
                  <span class="file-download handle-icon" @click="handleDownload(item)"></span>
                </div>
              </template>
              <template v-else>
                <el-image
                  v-if="showImageUrl(item.fileId)"
                  class="img image-icon"
                  :src="imageUrl(item)"
                  fit="contain"
                  :lazy="lazy"
                  @click="handlePreview(item)"
                >
                  <template #error>
                    <div class="image-error-slot">
                      {{ $t('failed') }}
                    </div>
                  </template>
                </el-image>
                <el-image
                  v-if="!showImageUrl(item.fileId)"
                  class="img"
                  :src="item.fileUrl"
                  :zoom-rate="1.2"
                  :max-scale="7"
                  :min-scale="0.2"
                  :preview-src-list="[item.fileUrl]"
                  :initial-index="0"
                  fit="contain"
                  :lazy="lazy"
                >
                  <template #error>
                    <div class="image-error-slot">
                      {{ $t('failed') }}
                    </div>
                  </template>
                </el-image>
                <div class="handle-icon-bg"></div>
                <div class="handle-icon-wrap">
                  <span
                    v-if="showView(item.fileId)"
                    class="file-view handle-icon"
                    @click="handlePreview(item)"
                  ></span>
                  <span class="file-download handle-icon" @click="handleDownload(item)"></span>
                </div>
              </template>
            </div>
          </el-tooltip>
        </div>
        <div v-if="readonly && !fileInfoDTOS.length" class="file-item-nodata">
          <xNoData></xNoData>
        </div>
        <el-image
          ref="preViewFileRef"
          style="height: 0; width: 0"
          class="img"
          :src="preViewFileUrl"
          :class="{ 'pd-8': imgLoaded }"
          :zoom-rate="1.2"
          :max-scale="7"
          :min-scale="0.2"
          :preview-src-list="[preViewFileUrl]"
          :initial-index="0"
          fit="contain"
          :lazy="lazy"
          @close="preViewFileUrl = ''"
          @load="() => (imgLoaded = true)"
        />
      </slot>
    </div>
  </div>
</template>
<script setup>
import { watch, ref, computed, nextTick } from 'vue';
import xNoData from '@/components/xNoData.vue';
import { isPdf, isDoc, isDocx, isXls, isXlsx, isImage, downloadZip } from '@packages/utils';
import { uploadFile, downloadAttachment } from '@/api/common';
import { isBizSuccess } from '@packages/x-axios';
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const pdfImgUrl = new URL('@/assets/icon-pdf.png', import.meta.url).href;
const docImgUrl = new URL('@/assets/icon-doc.png', import.meta.url).href;
const docxImgUrl = new URL('@/assets/icon-docx.png', import.meta.url).href;
const xlsImgUrl = new URL('@/assets/icon-xls.png', import.meta.url).href;
const xlsxImgUrl = new URL('@/assets/icon-xlsx.png', import.meta.url).href;
const preViewFileUrl = ref('');
const preViewFileRef = ref(null);
const imgLoaded = ref(false);
const props = defineProps({
  modelValue: {
    type: Array,
    default: () => []
  },
  title: {
    type: String,
    default: ''
  },
  accept: {
    type: String,
    default: '.png, .jpg, .pdf, .jpeg, .doc, .docx, .xls, .xlsx'
  },
  multiple: {
    type: Boolean,
    default: true
  },
  readonly: {
    type: Boolean,
    default: false
  },
  lazy: {
    type: Boolean,
    default: false
  },
  preview: {
    type: String,
    default: 'blank'
  },
  // 单个文件最大体积 默认10M
  sizeLimit: {
    type: Number,
    default: 10 * 1024 * 1024
  },
  // 最大上传数量 默认10个
  numLimit: {
    type: Number,
    default: 10
  },
  extraParams: {
    type: Object,
    default: () => {
      return {};
    }
  },
  hideTip: {
    type: Boolean,
    default: false
  },
  /** 自定义上传：入参 FormData（已含 file与 extraParams），返回与通用上传相同结构的 Promise */
  uploadRequest: {
    type: Function,
    default: null
  },
  /** 自定义下载：入参 item，返回 axios 完整响应（blob，status 200） */
  downloadRequest: {
    type: Function,
    default: null
  }
});
const emits = defineEmits(['update:modelValue', 'delete-file']);
const title = computed(() => props.title);
const readonly = computed(() => props.readonly);
const preview = computed(() => props.preview);
const lazy = computed(() => props.lazy);
// doc、docx、xls、xlsx不支持查看
const showView = computed(() => {
  return (fileId) => {
    return !isDoc(fileId) && !isDocx(fileId) && !isXls(fileId) && !isXlsx(fileId);
  };
});
// pdf、doc、docx、xls、xlsx展示的是图标，png、jpg、jpeg展示的是缩略图
const showImageUrl = computed(() => {
  return (fileId) => {
    return isPdf(fileId) || isDoc(fileId) || isDocx(fileId) || isXls(fileId) || isXlsx(fileId);
  };
});
// pdf、doc、docx、xls、xlsx展示图标不同
const imageUrl = computed(() => {
  return ({ fileId, fileUrl }) => {
    if (isPdf(fileId)) return pdfImgUrl;
    else if (isDoc(fileId)) return docImgUrl;
    else if (isDocx(fileId)) return docxImgUrl;
    else if (isXls(fileId)) return xlsImgUrl;
    else if (isXlsx(fileId)) return xlsxImgUrl;
    else return fileUrl;
  };
});
const fileInfoDTOS = ref([]); // 上传文件
const curFileNum = computed(() => fileInfoDTOS.value.filter((file) => !file.delFlag).length);
const chooseUploadList = ref([]); // 一次选中的文件
const beforeUpload = (file) => {
  // 若已经上传了{numLimit}个文件，则不允许再上传
  if (curFileNum.value >= props.numLimit) {
    ElMessage({
      message: t('uploader.overLimit', { num: props.numLimit }),
      type: 'error'
    });
    return false;
  }
  // 选中多个文件上传时判断总数是否超出{numLimit}
  chooseUploadList.value.push(file); // 存储当次选中的文件
  if (chooseUploadList.value.length + curFileNum.value > props.numLimit) {
    ElMessage({
      message: t('uploader.overLimit', { num: props.numLimit }),
      type: 'error'
    });
    return false;
  }
  return true; // 未超出的时候会正常走fileChange上传
};
const fileChange = (file) => {
  chooseUploadList.value = []; // 清空当次选中的文件
  if (file?.file?.size > props.sizeLimit) {
    ElMessage.error(t('uploader.overSize', { size: `${props.sizeLimit / 1024 / 1024}MB` }));
    return false;
  }
  const allowedExtensions = /\.(png|jpg|pdf|jpeg|doc|docx|xls|xlsx)$/i;
  if (!allowedExtensions.test(file.file.name)) {
    ElMessage({
      message: t('uploader.errorExtTip'),
      type: 'error'
    });
    return false;
  }
  const Formdata = new FormData();
  Formdata.append('file', file.file);
  for (const i in props.extraParams) {
    Formdata.append(i, props.extraParams[i]);
  }
  const uploadExec = props.uploadRequest
    ? props.uploadRequest
    : (fd) =>
        uploadFile(fd, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
  uploadExec(Formdata).then((res) => {
    if (isBizSuccess(res.code)) {
      fileInfoDTOS.value.unshift(res.data);
      emits('update:modelValue', fileInfoDTOS.value);
      ElMessage({
        message: t('uploader.success'),
        type: 'success'
      });
    }
  });
};
const handleRemove = (file, index) => {
  ElMessageBox.confirm(t('deleteTip'), t('tip'), {
    showCancelButton: false,
    confirmButtonText: t('confirm'),
    customStyle: { 'max-width': '560px', 'margin-top': '-40vh', 'border-radius': '10px' }
  })
    .then(() => {
      emits('delete-file', { file });
    })
    .catch(() => {});
};
const handlePreview = (item) => {
  if (!isImage(item.fileId)) {
    window.open(item.fileUrl);
  } else {
    preViewFileUrl.value = item.fileUrl;
    imgLoaded.value = false;
    nextTick(() => {
      preViewFileRef.value.$el.children[0].click();
    });
  }
};
// 下载
const handleDownload = (item) => {
  const downloadExec = props.downloadRequest
    ? props.downloadRequest
    : (row) => downloadAttachment({ fileId: row.fileId });
  downloadExec(item).then((res) => {
    if (res.status === 200) {
      downloadZip(res);
    }
  });
};
watch(
  () => props.modelValue,
  (val) => {
    if (!val) {
      return;
    }
    fileInfoDTOS.value = (val || []).map((item) => ({ ...item }));
  },
  { immediate: true }
);
</script>
<style lang="scss" scoped>
.upload-wrap {
  width: 100%;
  .attachment-title {
    font-size: 14px;
    color: #222222;
    text-align: left;
    line-height: 22px;
    font-weight: 400;
  }
  .upload-tip {
    font-size: 14px;
    color: #999999;
    letter-spacing: 0;
    line-height: 22px;
    font-weight: 400;
  }
  .file-list {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    align-items: center;
    .file-item {
      position: relative;
      flex: 0 0 62px;
      height: 62px;
      box-sizing: border-box;
      border: 1px solid #e6e6e6;
      border-radius: 8px;
      margin-right: 8px;
      margin-top: 8px;
      padding: 4px;
      &:hover {
        .handle-icon-bg {
          display: block;
        }
        .handle-icon-wrap {
          display: flex;
          justify-content: space-around;
        }
      }
      .handle-icon-bg {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(34, 34, 34, 0.48);
        border-radius: 8px;
      }
      .handle-icon-wrap {
        display: none;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 8px;
        line-height: 64px;
        text-align: center;
        .handle-icon {
          height: 16px;
          width: 16px;
          display: inline-block;
          background: no-repeat center center;
          background-size: 100%;
          background-image: url(@/assets/attach-view-icon-white.png);
          margin: auto 0;
          cursor: pointer;
          &.file-delete {
            background-image: url(@/assets/attach-delete-icon-white.png);
          }
          &.file-download {
            background-image: url(@/assets/attach-download.png);
          }
        }
      }
      .img {
        display: block;
        height: 52px;
        width: 52px;
      }
      .image-icon {
        padding: 7px;
      }
      .upload-box {
        height: 52px;
        width: 52px;
        line-height: 52px;
        background: url(@/assets/plus-icon.png) no-repeat center center;
        background-size: 16px 16px;
      }
    }
    .file-item-nodata {
      padding-top: 10px;
      height: 70px;
      width: 100%;
    }
  }
}
.no-data {
  font-size: 14px;
  color: #999999;
  letter-spacing: 0;
  line-height: 22px;
  font-weight: 500;
  margin-top: 4px;
}
.image-error-slot {
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 14px;
  color: #999999;
}
</style>

export default () => {
  // 文件下载
  const blob2File = (res) => {
    const fileReader = new FileReader();
    fileReader.readAsText(res.data);
    fileReader.onload = (e) => {
      const eleLink = document.createElement('a');
      eleLink.download = res.headers['content-disposition'].split('=')[1];
      eleLink.style.display = 'none';
      // 字符内容转变成blob地址
      const blob = new Blob([res.data], {
        type: 'application/force-download'
      });
      eleLink.href = URL.createObjectURL(blob);
      document.body.appendChild(eleLink);
      eleLink.click();
      document.body.removeChild(eleLink);
    };
  };
  return {
    blob2File
  };
};

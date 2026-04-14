<template>
  <div id="HomeView">
    <div id="viewport">
      <!-- Sidebar -->
      <SideBar />

      <!-- Content -->
      <ContentPart></ContentPart>
      <div>
        <router-view />
      </div>
    </div>
  </div>
</template>
<script>
import ContentPart from '@/components/ContentPart.vue';
import SideBar from '../components/SideBar.vue';

export default {
  name: "HomeView",
  components: {
    SideBar,
    ContentPart
  },
};
</script>
<style>
body {
  overflow-x: hidden;
  font-family: "Roboto", sans-serif;
  font-size: 16px;
}

/* Toggle Styles */
#viewport {
  padding-left: 200px;
  -webkit-transition: all 0.5s ease;
  -moz-transition: all 0.5s ease;
  -o-transition: all 0.5s ease;
  transition: all 0.5s ease;
}
</style>
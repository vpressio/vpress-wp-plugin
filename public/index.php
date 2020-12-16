<?php wp_head();?>
<noscript>
  <strong>We're sorry but Vpress doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
</noscript>
<div id="front"></div>
  <!-- Todo: change script enquue -->
<script type="text/javascript">
  var vpress_id = <?= $gdata; ?>
</script>
<?php wp_footer();?>

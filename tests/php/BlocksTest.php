<?php
/**
 * `vpress/chart` block: registration, editor config, render.php.
 *
 * @package Vpress
 */

use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use PHPUnit\Framework\TestCase;

/*
 * vpress_render_figure() / vpress_enqueue_embed_assets() keep function
 * statics, so each test runs in its own process.
 */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState( false )]
final class BlocksTest extends TestCase {

	protected function setUp(): void {
		$GLOBALS['wpdb'] = new Vpress_Test_Wpdb();
	}

	private function seed_public_chart(): void {
		$GLOBALS['wpdb']->rows[1] = array(
			'id'          => '1',
			'dataset_id'  => '7',
			'title'       => 'Ventas por estado',
			'description' => '',
			'permissions' => 'public',
			'value'       => json_encode(
				array(
					'chart'    => 'bars',
					'subtitle' => 'Suma de ventas, 2026',
				)
			),
		);
	}

	/** Render blocks/chart/render.php the way WordPress does (include + output buffer). */
	private function render_block( array $attributes ): string {
		$content = '';
		$block   = null;
		ob_start();
		include VPRESS_PLUGIN_DIR . 'blocks/chart/render.php';
		return (string) ob_get_clean();
	}

	public function test_block_json_declares_the_dynamic_block(): void {
		$meta = json_decode( (string) file_get_contents( VPRESS_PLUGIN_DIR . 'blocks/chart/block.json' ), true );

		$this->assertSame( 'https://schemas.wp.org/trunk/block.json', $meta['$schema'] );
		$this->assertSame( 3, $meta['apiVersion'] );
		$this->assertSame( 'vpress/chart', $meta['name'] );
		$this->assertSame( 'embed', $meta['category'] );
		$this->assertSame( array( 'type' => 'integer' ), $meta['attributes']['chartId'] );
		$this->assertSame( array( 'type' => 'boolean', 'default' => true ), $meta['attributes']['showCaption'] );
		$this->assertSame( array( 'wide', 'full' ), $meta['supports']['align'] );
		$this->assertSame( 'file:./render.php', $meta['render'] );
		$this->assertArrayNotHasKey( 'viewScriptModule', $meta, 'vpress_render_figure() enqueues the front-end assets' );
		foreach ( array( 'editorScript', 'editorStyle', 'render' ) as $key ) {
			$this->assertFileExists( VPRESS_PLUGIN_DIR . 'blocks/chart/' . substr( $meta[ $key ], strlen( 'file:./' ) ) );
		}

		$asset = require VPRESS_PLUGIN_DIR . 'blocks/chart/index.asset.php';
		foreach ( array( 'wp-api-fetch', 'wp-block-editor', 'wp-blocks', 'wp-components', 'wp-element', 'wp-i18n' ) as $dep ) {
			$this->assertContains( $dep, $asset['dependencies'] );
		}
	}

	public function test_render_prints_the_figure_with_the_block_wrapper_attributes(): void {
		$this->seed_public_chart();

		$html = $this->render_block( array( 'chartId' => 1 ) );

		$this->assertStringStartsWith( '<figure class="wp-block-vpress-chart vpress-figure vpress-figure--bars vpress-figure--light"', $html );
		$this->assertStringContainsString( 'class="wp-block-vpress-chart', $html );
		$this->assertStringContainsString( 'data-vpress-chart="1"', $html );
		$this->assertStringContainsString( 'data-vpress-rest="http://example.test/wp-json/vpress/v1/"', $html );
		$this->assertStringContainsString( '<figcaption class="vpress-figure__caption"><span class="vpress-figure__title">Ventas por estado</span>', $html );
		$this->assertContains( 'wp_enqueue_script_module', array_column( $GLOBALS['vpress_test_calls'], 0 ), 'the figure enqueues the embed' );
	}

	public function test_show_caption_false_omits_the_figcaption(): void {
		$this->seed_public_chart();

		$html = $this->render_block( array( 'chartId' => 1, 'showCaption' => false ) );

		$this->assertStringContainsString( 'data-vpress-chart="1"', $html );
		$this->assertStringNotContainsString( '<figcaption', $html );
		$this->assertStringContainsString( 'aria-label="Ventas por estado"', $html, 'the chart keeps its accessible name' );
		$this->assertStringEndsWith( '</div></figure>', $html );
	}

	public function test_alignment_anchor_and_spacing_come_from_the_wrapper_once(): void {
		$this->seed_public_chart();
		$GLOBALS['vpress_test_wrapper'] = 'class="wp-block-vpress-chart alignwide" id="ventas" style="margin-top:var(--wp--preset--spacing--40);"';

		$html = $this->render_block( array( 'chartId' => 1, 'align' => 'wide' ) );

		$this->assertStringStartsWith( '<figure class="wp-block-vpress-chart alignwide vpress-figure vpress-figure--bars vpress-figure--light" id="ventas"', $html );
		$this->assertSame( 1, substr_count( $html, 'alignwide' ), 'align class is not duplicated' );
		$this->assertStringContainsString( ' style="margin-top:var(--wp--preset--spacing--40);"', $html );
	}

	public function test_wrapper_attributes_cannot_break_out_or_override_the_contract(): void {
		$this->seed_public_chart();
		$GLOBALS['vpress_test_wrapper'] = 'class="wp-block-vpress-chart &quot;&gt;&lt;script&gt;" data-vpress-chart="999" onclick="alert(1)" title="a &amp; b"';

		$html = $this->render_block( array( 'chartId' => 1 ) );

		$this->assertStringNotContainsString( '<script', $html );
		$this->assertStringNotContainsString( 'onclick', $html );
		$this->assertStringNotContainsString( '999', $html );
		$this->assertSame( 1, substr_count( $html, 'data-vpress-chart=' ) );
		$this->assertStringContainsString( ' title="a &amp; b"', $html, 'values are escaped once, not double-encoded' );
	}

	public function test_unknown_chart_shows_a_notice_to_editors_and_nothing_to_visitors(): void {
		$this->assertSame( '', $this->render_block( array( 'chartId' => 42 ) ) );
		$this->assertSame( '', $this->render_block( array() ) );

		$GLOBALS['vpress_test_caps'] = array( 'edit_posts' );
		$this->assertSame(
			'<div class="vpress-figure vpress-figure--missing">Vpress: chart #42 is not available. Choose another chart in the editor.</div>',
			$this->render_block( array( 'chartId' => 42 ) )
		);
		$this->assertStringContainsString( 'no chart selected', $this->render_block( array() ) );
		$this->assertSame( array(), $GLOBALS['vpress_test_calls'], 'nothing is enqueued without a figure' );
	}

	public function test_private_chart_is_hidden_from_visitors(): void {
		$this->seed_public_chart();
		$GLOBALS['wpdb']->rows[1]['permissions'] = 'private';

		$this->assertSame( '', $this->render_block( array( 'chartId' => 1 ) ) );
	}

	public function test_register_registers_the_block_folder_and_localizes_the_editor_script(): void {
		Vpress_Blocks::register();

		$calls = $GLOBALS['vpress_test_calls'];
		$this->assertSame( array( 'register_block_type_from_metadata', array( VPRESS_PLUGIN_DIR . 'blocks/chart' ) ), $calls[0] );
		$this->assertSame( 'wp_add_inline_script', $calls[1][0] );
		list( $handle, $script, $position ) = $calls[1][1];
		$this->assertSame( 'vpress-chart-editor-script', $handle );
		$this->assertSame( 'before', $position );
		$this->assertStringStartsWith( 'window.vpressBlock = {', $script );

		$config = json_decode( substr( $script, strlen( 'window.vpressBlock = ' ), -1 ), true );
		$this->assertSame(
			array(
				'embedUrl' => 'http://example.test/wp-content/plugins/vpress/admin/dist/js/embed.js?ver=0.2.0-test',
				'embedCss' => 'http://example.test/wp-content/plugins/vpress/admin/dist/css/embed.css?ver=0.2.0-test',
				'restRoot' => 'http://example.test/wp-json/vpress/v1/',
				'adminUrl' => 'http://example.test/wp-admin/admin.php?page=vpress',
				'nonce'    => 'nonce-wp_rest',
			),
			$config
		);
	}

	public function test_editor_config_uses_the_vite_dev_server_in_dev(): void {
		$GLOBALS['vpress_test_filters']['vpress_client'] = static function () {
			return array( 'env' => 'dev', 'location' => 'http://localhost:5180/' );
		};

		$config = Vpress_Blocks::editor_config();

		$this->assertSame( 'http://localhost:5180/src/embed.js', $config['embedUrl'] );
		$this->assertSame( 'http://localhost:5180/src/embed/embed.css', $config['embedCss'] );
	}

	public function test_register_skips_the_inline_config_without_an_editor_script(): void {
		$GLOBALS['vpress_test_editor_handles'] = array();

		Vpress_Blocks::register();

		$this->assertNotContains( 'wp_add_inline_script', array_column( $GLOBALS['vpress_test_calls'], 0 ) );
	}
}

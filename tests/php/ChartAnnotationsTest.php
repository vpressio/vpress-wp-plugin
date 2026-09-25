<?php
/**
 * vpress_sanitize_annotations() and the `annotations` key's round-trip
 * through /chart/create and /chart/update.
 *
 * @package Vpress
 */

use PHPUnit\Framework\TestCase;

final class ChartAnnotationsTest extends TestCase {

	private FakeWpdb $wpdb;

	protected function setUp(): void {
		$this->wpdb      = new FakeWpdb();
		$GLOBALS['wpdb'] = $this->wpdb;
	}

	/** The four shapes of the data model, exactly as the editor writes them. */
	private static function valid_set(): array {
		return array(
			array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 500, 'label' => 'Meta anual', 'color' => 'signal' ),
			array( 'id' => 'a2', 'type' => 'point', 'x' => 'Oct', 'y' => 688, 'label' => '+73% vs. septiembre' ),
			array( 'id' => 'a3', 'type' => 'range', 'axis' => 'x', 'from' => 'Oct', 'to' => 'Dic', 'label' => 'Tras el pico' ),
			array( 'id' => 'a4', 'type' => 'text', 'x' => 'Mar', 'y' => 400, 'label' => 'Nota libre' ),
		);
	}

	/** $n annotations with sequential ids. */
	private static function many( int $n ): array {
		$out = array();
		for ( $i = 1; $i <= $n; $i++ ) {
			$out[] = array( 'id' => 'a' . $i, 'type' => 'line', 'axis' => 'y', 'value' => $i );
		}
		return $out;
	}

	// --- vpress_sanitize_annotations ---------------------------------------

	public function test_a_valid_set_round_trips_unchanged(): void {
		$this->assertSame( self::valid_set(), vpress_sanitize_annotations( self::valid_set() ) );
	}

	public function test_a_raw_hex_colour_is_dropped_to_the_default(): void {
		$clean = vpress_sanitize_annotations(
			array( array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 10, 'color' => '#ff0000' ) )
		);

		$this->assertCount( 1, $clean, 'the annotation survives; only the colour is refused' );
		$this->assertArrayNotHasKey( 'color', $clean[0], 'a hex never reaches the renderer, which would bypass the contrast rules' );
	}

	public function test_only_the_named_colour_tokens_are_kept(): void {
		foreach ( array( 'signal', 'muted', 'series' ) as $token ) {
			$clean = vpress_sanitize_annotations(
				array( array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1, 'color' => $token ) )
			);
			$this->assertSame( $token, $clean[0]['color'] );
		}
		$clean = vpress_sanitize_annotations(
			array( array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1, 'color' => 'rebeccapurple' ) )
		);
		$this->assertArrayNotHasKey( 'color', $clean[0] );
	}

	public function test_an_unknown_type_is_removed(): void {
		$clean = vpress_sanitize_annotations(
			array(
				array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 10 ),
				array( 'id' => 'a2', 'type' => 'arrow', 'x' => 'Oct', 'y' => 1 ),
				array( 'id' => 'a3', 'type' => 'text', 'x' => 'Mar', 'y' => 400 ),
			)
		);

		$this->assertSame( array( 'a1', 'a3' ), array_column( $clean, 'id' ), 'the unknown type is dropped, never fatal, and the others keep their ids' );
	}

	public function test_a_duplicate_id_is_de_duplicated_keeping_the_first(): void {
		$clean = vpress_sanitize_annotations(
			array(
				array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 10, 'label' => 'first' ),
				array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 20, 'label' => 'second' ),
			)
		);

		$this->assertCount( 1, $clean );
		$this->assertSame( 'first', $clean[0]['label'] );
	}

	public function test_twenty_one_entries_are_a_four_hundred(): void {
		$error = vpress_sanitize_annotations( self::many( 21 ) );

		$this->assertInstanceOf( WP_Error::class, $error );
		$this->assertSame( 'vpress_too_many_annotations', $error->get_error_code() );
		$this->assertSame( 400, $error->get_error_data()['status'] );
	}

	public function test_twenty_entries_are_accepted(): void {
		$this->assertCount( 20, vpress_sanitize_annotations( self::many( 20 ) ), 'the cap itself is not the failure' );
	}

	public function test_a_non_array_is_an_empty_list(): void {
		$this->assertSame( array(), vpress_sanitize_annotations( null ) );
		$this->assertSame( array(), vpress_sanitize_annotations( 'a1' ) );
		$this->assertSame( array(), vpress_sanitize_annotations( 7 ) );
		$this->assertSame( array(), vpress_sanitize_annotations( (object) array( 'id' => 'a1' ) ) );
	}

	public function test_an_id_outside_the_slug_shape_drops_the_entry(): void {
		$clean = vpress_sanitize_annotations(
			array(
				array( 'id' => 'a 1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
				array( 'id' => '<b>x</b>', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
				array( 'id' => str_repeat( 'a', 33 ), 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
				array( 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
				array( 'id' => 'ok-1_2', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
			)
		);

		$this->assertSame( array( 'ok-1_2' ), array_column( $clean, 'id' ), 'an annotation with no stable id has nothing a story can reference' );
	}

	public function test_an_unplaceable_annotation_is_dropped_not_guessed(): void {
		$clean = vpress_sanitize_annotations(
			array(
				array( 'id' => 'a1', 'type' => 'line', 'value' => 1 ),
				array( 'id' => 'a2', 'type' => 'line', 'axis' => 'z', 'value' => 1 ),
				array( 'id' => 'a3', 'type' => 'line', 'axis' => 'y' ),
				array( 'id' => 'a4', 'type' => 'range', 'axis' => 'x', 'from' => 'Oct' ),
				array( 'id' => 'a5', 'type' => 'point', 'x' => 'Oct' ),
				array( 'id' => 'a6', 'type' => 'point', 'x' => 'Oct', 'y' => array( 1 ) ),
				array( 'id' => 'a7', 'type' => 'point', 'x' => 'Oct', 'y' => 1 ),
			)
		);

		$this->assertSame( array( 'a7' ), array_column( $clean, 'id' ) );
	}

	public function test_axis_is_stripped_from_a_point_and_a_text(): void {
		$clean = vpress_sanitize_annotations(
			array( array( 'id' => 'a1', 'type' => 'point', 'axis' => 'y', 'x' => 'Oct', 'y' => 1 ) )
		);

		$this->assertSame( array( 'id' => 'a1', 'type' => 'point', 'x' => 'Oct', 'y' => 1 ), $clean[0] );
	}

	public function test_a_label_is_sanitised_and_markup_never_survives(): void {
		$clean = vpress_sanitize_annotations(
			array( array( 'id' => 'a1', 'type' => 'text', 'x' => 'Mar', 'y' => 1, 'label' => "<b>Pico</b>\n  del  año" ) )
		);

		$this->assertSame( 'Pico del año', $clean[0]['label'] );
	}

	public function test_an_empty_label_is_omitted_rather_than_stored_blank(): void {
		$clean = vpress_sanitize_annotations(
			array( array( 'id' => 'a1', 'type' => 'text', 'x' => 'Mar', 'y' => 1, 'label' => '   ' ) )
		);

		$this->assertArrayNotHasKey( 'label', $clean[0] );
	}

	public function test_numbers_keep_their_json_type_and_categories_stay_strings(): void {
		$clean = vpress_sanitize_annotations(
			array(
				array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 500 ),
				array( 'id' => 'a2', 'type' => 'line', 'axis' => 'y', 'value' => 68.5 ),
				array( 'id' => 'a3', 'type' => 'line', 'axis' => 'x', 'value' => '2026' ),
			)
		);

		$this->assertSame( 500, $clean[0]['value'] );
		$this->assertSame( 68.5, $clean[1]['value'] );
		$this->assertSame( '2026', $clean[2]['value'], 'a numeric-looking category is not cast: the server cannot tell it from a linear value' );
	}

	// --- the REST round-trip ------------------------------------------------

	/** The config the admin saves: chart #1 plus the annotations given. */
	private static function config_with( array $annotations ): string {
		$config                = VpressFixtures::chart_1_context();
		$config['annotations'] = $annotations;
		return json_encode( $config );
	}

	/** The `value` column the write route handed to wpdb. */
	private function stored_value(): array {
		$write = end( $this->wpdb->writes );
		$this->assertIsArray( $write, 'the route wrote a row' );
		return json_decode( $write[2]['value'], true );
	}

	public function test_update_stores_the_sanitised_annotations(): void {
		$request = new FakeRestRequest(
			array(
				'id'          => '1',
				'value'       => self::config_with(
					array(
						array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 500, 'label' => '<i>Meta</i>', 'color' => '#ff0000' ),
						array( 'id' => 'a2', 'type' => 'wormhole', 'x' => 'Oct', 'y' => 1 ),
					)
				),
				'tags'        => '',
				'description' => '',
				'permissions' => 'public',
			)
		);

		vpress_update_chart( $request );

		$stored = $this->stored_value();
		$this->assertSame(
			array( array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 500, 'label' => 'Meta' ) ),
			$stored['annotations']
		);
		$this->assertSame( 'bars', $stored['chart'], 'the rest of the config is untouched' );
	}

	public function test_create_stores_the_sanitised_annotations(): void {
		$request = new FakeRestRequest(
			array(
				'dataset_id'  => '2',
				'value'       => self::config_with( self::valid_set() ),
				'owner_id'    => '1',
				'description' => '',
				'permissions' => 'public',
				'img_url'     => '',
			)
		);

		vpress_create_chart( $request );

		$this->assertSame( self::valid_set(), $this->stored_value()['annotations'] );
	}

	public function test_a_config_over_the_cap_is_rejected_and_nothing_is_written(): void {
		$request = new FakeRestRequest(
			array( 'id' => '1', 'value' => self::config_with( self::many( 21 ) ), 'tags' => '', 'description' => '', 'permissions' => 'public' )
		);

		$result = vpress_update_chart( $request );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 400, $result->get_error_data()['status'] );
		$this->assertSame( array(), $this->wpdb->writes, 'a rejected save writes nothing' );
	}

	public function test_a_config_without_annotations_is_stored_byte_for_byte(): void {
		$value   = VpressFixtures::CHART_1_VALUE;
		$request = new FakeRestRequest(
			array( 'id' => '1', 'value' => $value, 'tags' => '', 'description' => '', 'permissions' => 'public' )
		);

		vpress_update_chart( $request );

		$write = end( $this->wpdb->writes );
		$this->assertSame( $value, $write[2]['value'], 'this may never reformat a config it does not understand' );
	}

	public function test_a_value_that_is_not_json_is_passed_through(): void {
		$this->assertSame( 'not json', vpress_sanitize_chart_value( 'not json' ) );
		$this->assertSame( '', vpress_sanitize_chart_value( '' ) );
		$this->assertNull( vpress_sanitize_chart_value( null ) );
	}
}

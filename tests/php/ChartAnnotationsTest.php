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

	// --- the id counter (annotationSeq) -------------------------------------

	public function test_the_counter_is_the_highest_id_ever_issued(): void {
		$annotations = array(
			array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
			array( 'id' => 'a7', 'type' => 'line', 'axis' => 'y', 'value' => 2 ),
			array( 'id' => 'a3', 'type' => 'line', 'axis' => 'y', 'value' => 3 ),
		);

		$this->assertSame( 7, vpress_annotation_seq( $annotations, 7 ) );
		$this->assertSame( 12, vpress_annotation_seq( $annotations, 12 ), 'a counter above the survivors is the point: those ids were issued and deleted' );
	}

	public function test_a_legacy_config_derives_its_counter_from_the_ids_present(): void {
		$config = VpressFixtures::chart_1_context();
		// Saved before the counter existed: annotations, no annotationSeq.
		$config['annotations'] = array(
			array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
			array( 'id' => 'a2', 'type' => 'line', 'axis' => 'y', 'value' => 2 ),
			array( 'id' => 'a3', 'type' => 'line', 'axis' => 'y', 'value' => 3 ),
		);
		$this->assertArrayNotHasKey( VPRESS_ANNOTATION_SEQ, $config );

		$stored = json_decode( vpress_sanitize_chart_value( json_encode( $config ) ), true );

		$this->assertSame( 3, $stored[ VPRESS_ANNOTATION_SEQ ] );
	}

	public function test_a_tampered_counter_is_floored_up_never_trusted_down(): void {
		$annotations = array(
			array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
			array( 'id' => 'a9', 'type' => 'line', 'axis' => 'y', 'value' => 2 ),
		);

		// Below the truth: trusting it would reissue a9 and rebind a story step.
		$this->assertSame( 9, vpress_annotation_seq( $annotations, 2 ) );
		$this->assertSame( 9, vpress_annotation_seq( $annotations, 0 ) );
		$this->assertSame( 9, vpress_annotation_seq( $annotations, -40 ) );
		$this->assertSame( 9, vpress_annotation_seq( $annotations, 'nueve' ) );
		$this->assertSame( 9, vpress_annotation_seq( $annotations, null ) );
		$this->assertSame( 9, vpress_annotation_seq( $annotations, array( 99 ) ) );
		$this->assertSame( 0, vpress_annotation_seq( array(), null ), 'a chart with no annotations starts at zero' );
	}

	public function test_a_hand_written_id_does_not_drive_the_counter(): void {
		$annotations = array( array( 'id' => 'meta-anual', 'type' => 'line', 'axis' => 'y', 'value' => 1 ) );

		$this->assertSame( 0, vpress_annotation_seq( $annotations, null ) );
		$this->assertSame( 4, vpress_annotation_seq( $annotations, 4 ), 'but a real counter still wins' );
	}

	public function test_the_counter_survives_an_update_round_trip(): void {
		$config = VpressFixtures::chart_1_context();
		$config['annotations']            = array( array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ) );
		$config[ VPRESS_ANNOTATION_SEQ ] = 8;

		$request = new FakeRestRequest(
			array( 'id' => '1', 'value' => json_encode( $config ), 'tags' => '', 'description' => '', 'permissions' => 'public' )
		);
		vpress_update_chart( $request );

		$this->assertSame( 8, $this->stored_value()[ VPRESS_ANNOTATION_SEQ ], 'a1 is the only survivor, but a2..a8 were issued and must never come back' );
	}

	public function test_deleting_the_highest_annotation_does_not_lower_the_counter(): void {
		// What the editor sends after deleting a3 from a1,a2,a3.
		$config = VpressFixtures::chart_1_context();
		$config['annotations']            = array(
			array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
			array( 'id' => 'a2', 'type' => 'line', 'axis' => 'y', 'value' => 2 ),
		);
		$config[ VPRESS_ANNOTATION_SEQ ] = 3;

		$stored = json_decode( vpress_sanitize_chart_value( json_encode( $config ) ), true );

		$this->assertSame( 3, $stored[ VPRESS_ANNOTATION_SEQ ] );
		$this->assertSame( array( 'a1', 'a2' ), array_column( $stored['annotations'], 'id' ) );
	}

	public function test_a_counter_without_annotations_is_still_normalised(): void {
		$config = VpressFixtures::chart_1_context();
		$config[ VPRESS_ANNOTATION_SEQ ] = '5';

		$stored = json_decode( vpress_sanitize_chart_value( json_encode( $config ) ), true );

		$this->assertSame( 5, $stored[ VPRESS_ANNOTATION_SEQ ], 'a numeric string is cast, not stored as text' );
		$this->assertSame( array(), $stored['annotations'] );
	}


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

	public function test_a_client_cannot_lower_the_counter_by_deleting_the_annotation_that_carried_it(): void {
		// On disk: a legacy config with a1..a3 and no counter at all.
		$stored                = VpressFixtures::chart_1_context();
		$stored['annotations'] = array(
			array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 1 ),
			array( 'id' => 'a2', 'type' => 'line', 'axis' => 'y', 'value' => 2 ),
			array( 'id' => 'a3', 'type' => 'line', 'axis' => 'y', 'value' => 3 ),
		);
		$this->wpdb->on( '/^SELECT value FROM wp_vpresscore_charts WHERE id = 1$/', json_encode( $stored ) );

		// A client that is not the editor deletes a3 and sends no counter.
		$sent                = VpressFixtures::chart_1_context();
		$sent['annotations'] = array_slice( $stored['annotations'], 0, 2 );
		vpress_update_chart(
			new FakeRestRequest( array( 'id' => '1', 'value' => json_encode( $sent ), 'tags' => '', 'description' => '', 'permissions' => 'public' ) )
		);

		$this->assertSame( 3, $this->stored_value()[ VPRESS_ANNOTATION_SEQ ], 'a3 was issued; the next add must not reuse it' );
	}

	public function test_the_stored_row_only_raises_the_counter_never_lowers_it(): void {
		$stored = VpressFixtures::chart_1_context();
		$stored['annotations']            = array();
		$stored[ VPRESS_ANNOTATION_SEQ ] = 2;
		$this->wpdb->on( '/^SELECT value FROM wp_vpresscore_charts WHERE id = 1$/', json_encode( $stored ) );

		$sent                            = VpressFixtures::chart_1_context();
		$sent['annotations']             = array( array( 'id' => 'a9', 'type' => 'line', 'axis' => 'y', 'value' => 9 ) );
		$sent[ VPRESS_ANNOTATION_SEQ ]   = 9;
		vpress_update_chart(
			new FakeRestRequest( array( 'id' => '1', 'value' => json_encode( $sent ), 'tags' => '', 'description' => '', 'permissions' => 'public' ) )
		);

		$this->assertSame( 9, $this->stored_value()[ VPRESS_ANNOTATION_SEQ ] );
	}

	public function test_a_missing_or_unreadable_row_floors_at_nothing(): void {
		$this->assertSame( 0, vpress_annotation_seq_from_value( null ) );
		$this->assertSame( 0, vpress_annotation_seq_from_value( 'not json' ) );
		$this->assertSame( 0, vpress_annotation_seq_from_value( '{"chart":"bars"}' ) );
		$this->assertSame( 4, vpress_annotation_seq_from_value( '{"annotations":[],"annotationSeq":4}' ) );
		$this->assertSame( 6, vpress_annotation_seq_from_value( '{"annotations":[{"id":"a6"}]}' ), 'derived from the ids when the row predates the counter' );
	}

	public function test_a_config_modelling_neither_key_cannot_erase_a_stored_counter(): void {
		// On disk: a chart that has been annotated, counter at 5.
		$stored                          = VpressFixtures::chart_1_context();
		$stored['annotations']           = array( array( 'id' => 'a5', 'type' => 'line', 'axis' => 'y', 'value' => 1 ) );
		$stored[ VPRESS_ANNOTATION_SEQ ] = 5;
		$this->wpdb->on( '/^SELECT value FROM wp_vpresscore_charts WHERE id = 1$/', json_encode( $stored ) );

		// A client that does not model annotations at all — a stale bundle, or
		// an integration PUTting the config it understands.
		$sent = VpressFixtures::CHART_1_VALUE;
		$this->assertStringNotContainsString( 'annotation', $sent );

		vpress_update_chart(
			new FakeRestRequest( array( 'id' => '1', 'value' => $sent, 'tags' => '', 'description' => '', 'permissions' => 'public' ) )
		);

		$after = $this->stored_value();
		$this->assertSame( 5, $after[ VPRESS_ANNOTATION_SEQ ], 'erasing it would restart the next add at a1 and rebind a story step' );
		$this->assertSame( array(), $after['annotations'], 'the client did send an empty set; that part is honoured' );
		$this->assertSame( 'bars', $after['chart'], 'the rest of the config is the client\'s' );
	}

	public function test_a_config_modelling_neither_key_is_untouched_when_the_row_has_no_counter(): void {
		// No responder: get_var() returns null, so the floor is 0.
		$value = VpressFixtures::CHART_1_VALUE;

		vpress_update_chart(
			new FakeRestRequest( array( 'id' => '1', 'value' => $value, 'tags' => '', 'description' => '', 'permissions' => 'public' ) )
		);

		$write = end( $this->wpdb->writes );
		$this->assertSame( $value, $write[2]['value'], 'nothing to preserve, so nothing is rewritten' );
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

	public function test_saving_annotations_does_not_rewrite_the_rest_of_the_config(): void {
		$config = array(
			'chart'       => 'bars',
			'title'       => 'Ciudad de México',
			'xAxis'       => array( 'title' => 'estado', 'type' => 'ordinal', 'slug' => 'estado' ),
			'source'      => 'https://datos.gob.mx/a.csv',
			'annotations' => array( array( 'id' => 'a1', 'type' => 'line', 'axis' => 'y', 'value' => 500, 'label' => 'Meta anual' ) ),
			VPRESS_ANNOTATION_SEQ => 1,
		);
		// What the admin's JSON.stringify() sends (ChartPreset declares both keys,
		// in this order).
		$sent = json_encode( $config, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES );

		$stored = vpress_sanitize_chart_value( $sent );

		$this->assertSame( $sent, $stored, 'an annotated save must not re-escape the whole config' );
		$this->assertStringContainsString( 'México', $stored, '/chart/list searches these bytes with lower(value) LIKE' );
		$this->assertStringContainsString( 'https://datos.gob.mx', $stored );
	}

	public function test_a_value_that_is_not_json_is_passed_through(): void {
		$this->assertSame( 'not json', vpress_sanitize_chart_value( 'not json' ) );
		$this->assertSame( '', vpress_sanitize_chart_value( '' ) );
		$this->assertNull( vpress_sanitize_chart_value( null ) );
	}
}

<?php

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

/**
 * POST /chart/image: the `name` parameter names the chart the PNG belongs to,
 * and every other caller treats it as the chart id (vpress_delete_chart
 * removes "{id}.png"). Unsanitised it was a path, so an Author could write
 * attacker-controlled bytes anywhere the web user can write.
 */
final class ChartImageTest extends TestCase {

	private string $images;

	protected function setUp(): void {
		$this->images = $GLOBALS['vpress_test_upload_dir'] . '/vpress/images';
		wp_mkdir_p( $this->images );
	}

	private static function request( $name ): FakeRestRequest {
		return new FakeRestRequest(
			array(),
			array(
				'name'   => $name,
				'string' => 'data:image/png;base64,' . base64_encode( 'not-really-a-png' ),
			)
		);
	}

	public static function bad_names(): array {
		return array(
			'parent traversal'   => array( '../../pwned' ),
			'absolute path'      => array( '/tmp/pwned' ),
			'encoded traversal'  => array( '..%2F..%2Fpwned' ),
			'nested path'        => array( 'a/b' ),
			'empty'              => array( '' ),
			'missing'            => array( null ),
			'id with a suffix'   => array( '1; rm -rf' ),
			'not a number'       => array( 'chart-1' ),
		);
	}

	#[DataProvider( 'bad_names' )]
	public function test_a_name_that_is_not_a_chart_id_is_a_400( $name ): void {
		$result = vpress_image_chart( self::request( $name ) );

		$this->assertInstanceOf( WP_Error::class, $result );
		$this->assertSame( 'vpress_bad_image_name', $result->get_error_code() );
		$this->assertSame( 400, $result->get_error_data()['status'] );
	}

	public function test_a_traversal_payload_writes_nothing_outside_the_images_folder(): void {
		$outside = $GLOBALS['vpress_test_upload_dir'] . '/pwned.png';

		vpress_image_chart( self::request( '../../pwned' ) );

		$this->assertFileDoesNotExist( $outside );
		$this->assertSame( array(), glob( $this->images . '/*' ) ?: array() );
	}

	public function test_a_chart_id_still_writes_its_png_and_returns_its_url(): void {
		$url = vpress_image_chart( self::request( '7' ) );

		$this->assertSame( 'http://example.test/uploads/vpress/images/7.png', $url );
		$this->assertStringEqualsFile( $this->images . '/7.png', 'not-really-a-png' );
	}

	protected function tearDown(): void {
		foreach ( glob( $this->images . '/*' ) ?: array() as $file ) {
			unlink( $file );
		}
	}
}

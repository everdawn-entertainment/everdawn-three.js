import {ShaderMaterial} from '../materials/ShaderMaterial';
import {OrthographicCamera} from '../cameras/OrthographicCamera';
import {Scene} from '../scenes/Scene';
import {Mesh} from '../objects/Mesh';
import { Vector2 } from '../math/Vector2';
import {PlaneBufferGeometry} from '../geometries/PlaneGeometry';
import {Pass} from './Pass';
import { UniformsUtils } from '../renderers/shaders/UniformsUtils.js';
import { CustomShaders } from '../renderers/shaders/CustomLib';

/**
 * @author everdawn-entertainment
 * https://github.com/everdawn-entertainment
 * Shader implementation from nvidia gameworks
 */

function FXAAPass ( w, h, textureID ) {

	Pass.call( this );

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";
    this.uniforms = UniformsUtils.clone({
        "tDiffuse":   { value: null },
        "resolution": { value: new Vector2( 1 / w, 1 / h ) }
    });
	this.material = new ShaderMaterial( {
        uniforms: this.uniforms,
        vertexShader: CustomShaders.fxaa_vert,
        fragmentShader: CustomShaders.fxaa_frag
    } );

	this.camera = new OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	this.scene = new Scene();

	this.quad = new Mesh( new PlaneBufferGeometry( 2, 2 ), null );
	this.quad.frustumCulled = false; // Avoid getting clipped
	this.scene.add( this.quad );

};

FXAAPass.prototype = Object.assign( Object.create( Pass.prototype ), {

	constructor: FXAAPass,

	render: function( renderer, writeBuffer, readBuffer, delta, maskActive ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.quad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.render( this.scene, this.camera );

		} else {

			renderer.render( this.scene, this.camera, writeBuffer, this.clear );

		}

	}

} );

export { FXAAPass }
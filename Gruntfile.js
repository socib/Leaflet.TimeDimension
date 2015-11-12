'use strict';

module.exports = function(grunt) {

    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks("grunt-remove-logging");

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        meta: {
            banner: '/* \n' +
                ' * Leaflet TimeDimension v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %> \n' +
                ' * \n' +
                ' * Copyright <%= grunt.template.today("yyyy") %> <%= pkg.author.name %> \n' +
                ' * <%= pkg.author.email %> \n' +
                ' * <%= pkg.author.url %> \n' +
                ' * \n' +
                ' * Licensed under the <%= pkg.license %> license. \n' +
                ' * \n' +
                ' * Demos: \n' +
                ' * <%= pkg.homepage %> \n' +
                ' * \n' +
                ' * Source: \n' +
                ' * <%= pkg.repository.url %> \n' +
                ' * \n' +
                ' */\n'
        },
        clean: {
            dist: {
                src: ['dist/*']
            }
        },
        jshint: {
            options: {
                globals: {
                    console: true,
                    module: true
                },
                "-W099": true, //ignora tabs e space warning
                "-W033": true,
                "-W041": true,
                "-W004": true,
                "-W044": true //ignore regexp
            },
            files: ['src/*.js']
        },
        concat: {
            js: {
                options: {
                    banner: '<%= meta.banner %>' + 
                        '(function($){',
                    footer: '})(jQuery);'
                },
                src: [
                    'src/leaflet.timedimension.js',
                    'src/leaflet.timedimension.util.js',
                    'src/leaflet.timedimension.layer.js',
                    'src/leaflet.timedimension.layer.wms.js',
                    'src/leaflet.timedimension.layer.geojson.js',
                    'src/leaflet.timedimension.player.js',
                    'src/leaflet.timedimension.control.js'
                ],
                dest: 'dist/leaflet.timedimension.src.withlog.js'
            },
            css: {
                options: {
                    banner: '<%= meta.banner %>'
                },
                src: 'src/leaflet.timedimension.control.css',
                dest: 'dist/leaflet.timedimension.control.css'
            },
        },
        removelogging: {
            dist: {
                src: "dist/leaflet.timedimension.src.withlog.js",
                dest: "dist/leaflet.timedimension.src.js"
            }
        },
        uglify: {
            options: {
                banner: '<%= meta.banner %>'
            },
            dist: {
                files: {
                    'dist/leaflet.timedimension.min.js': ['dist/leaflet.timedimension.src.js']
                }
            }
        },
        cssmin: {
            combine: {
                files: {
                    'dist/leaflet.timedimension.control.min.css': ['dist/leaflet.timedimension.control.css']
                }
            },
            options: {
                banner: '<%= meta.banner %>'
            },
            minify: {
                expand: true,
                cwd: 'dist/',
                files: {
                    'dist/leaflet.timedimension.control.min.css': ['dist/leaflet.timedimension.control.css']
                }
            }
        },
        watch: {
            dist: {
                options: {
                    livereload: true
                },
                files: ['src/*', 'examples/*'],
                tasks: ['clean', 'concat', 'removelogging', 'cssmin', 'jshint']
            }
        }
    });

    grunt.registerTask('default', [
        'clean',
        'concat',
        'removelogging',
        'cssmin',
        'jshint',
        'uglify'
    ]);

};
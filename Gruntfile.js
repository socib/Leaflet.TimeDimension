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
        umd: {
          prefix: '(function (factory, window) {\n' +
                    '  if (typeof define === \'function\' && define.amd) {\n' +
                    '    // define an AMD module that relies on leaflet\n' +
                    '    define([\'leaflet\', \'iso8601-js-period\'], factory);\n' +
                    '  } else if (typeof exports === \'object\') {\n' +
                    '    // define a Common JS module that relies on leaflet\n' +
                    '    module.exports = factory(require(\'leaflet\'), require(\'iso8601-js-period\'));\n' +
                    '  } else if (typeof window !== \'undefined\' && window.L && typeof L !== \'undefined\') {\n' +
                    '    // get the iso8601 from the expected to be global nezasa scope\n' +
                    '    var iso8601 = nezasa.iso8601;\n' +
                    '    // attach your plugin to the global L variable\n' +
                    '    window.L.TimeDimension = factory(L, iso8601);\n' +
                    '  }\n' +
                    '  }(function (L, iso8601) {\n'+
                    '    // make sure iso8601 module js period module is available under the nezasa scope\n'+
                    '    if (typeof nezasa === \'undefined\') {\n'+
                    '      var nezasa = { iso8601: iso8601 };\n'+
                    '    }\n'+
                    '    // TimeDimension plugin implementation\n',
          postfix:  '    \n'+
                    '    return L.TimeDimension;\n'+
                    '  }, window)\n'+
                    ');'
        },
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
                    banner: '<%= meta.banner %>\n'+
                            '<%= umd.prefix %>',
                    footer: '<%= umd.postfix %>'
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
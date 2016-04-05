module.exports = function(grunt) {
    grunt.initConfig({
        babel: {
            options: {},

            dist: {
                files: [{
                    expand: true,
                    cwd: 'ws-server/src/js/',
                    src: ['**/*.js'],
                    dest: 'ws-server/dist/js/',
                    ext: '.js'
                }]
            }
        },
        watch: {
            js: {
                files: [
                    "ws-server/src/js/**/*"
                ],
                tasks: ['babel'],
                options: {
                    spawn: false
                }
            }
        }
    });

    grunt.loadNpmTasks('grunt-babel');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.registerTask('default', ['babel']);
};

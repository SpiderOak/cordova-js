var util = require('util'),
    fs = require('fs');

function include(files, transform) {
    files = files.map ? files : [files];
    return files.map(function (file) {
        var str = fs.readFileSync(file, "utf-8") + "\n";
        return transform ? transform(str, file) : str;
    }).join('\n');
}

module.exports = {
    modules: function (platform) {
        var files = [
                "lib/utils.js",
                "lib/channel.js",
                "lib/plugin/navigator.js",
                "lib/plugin/network.js",
                "lib/plugin/notification.js",
                "lib/plugin/accelerometer.js",
                "lib/plugin/Connection.js",
                "lib/plugin/" + platform + "/device.js",
                "lib/builder.js"
            ]
            output = "";

        //HACK: this seem suspect to include like this
        if (platform === "blackberry") {
            files.unshift("lib/plugin/blackberry/PluginManager.js");
            files.unshift("lib/plugin/blackberry/WebWorksPluginManager.js");
        }

        //include exec
        output += include('lib/exec/' + platform + '.js', function (file, path) {
            return "define('phonegap/exec'" +
                   ", function (require, exports, module) {\n" + file + "});\n";
        });

        //include phonegap
        output += include('lib/phonegap.js', function (file, path) {
            return "define('phonegap'" +
                   ", function (require, exports, module) {\n" + file + "});\n";
        });

        //include platform
        output += include('lib/platform/' + platform + '.js', function (file, path) {
            return "define('phonegap/platform'" +
                   ", function (require, exports, module) {\n" + file + "});\n";
        });

        //HACK: Get this in soon so we have access to it for the native layer
        output += "window.PhoneGap = require('phonegap');";

        //include modules
        output += include(files, function (file, path) {
            var id = path.replace(/lib\//, "phonegap/").replace(/\.js$/, ''); 
            return "define('" + id + "', function (require, exports, module) {\n" + file + "});\n";
        });

        return output;
    },

    bundle: function (platform) {
    	var output = "";

        //include LICENSE
        output += include("LICENSE", function (file) {
            return "/*\n" + file + "\n*/\n";
        });

        //include require
        output += include("thirdparty/almond.js");
        output += "require.unordered = true;";

        //include modules
        output += this.modules(platform);

        //include bootstrap
        output += include('lib/bootstrap.js');

        fs.writeFileSync(__dirname + "/../pkg/phonegap." + platform + ".js", output);
    }
};
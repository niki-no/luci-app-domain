module("luci.controller.mydomain", package.seeall)

local i18n = require("luci.i18n")
local translate = i18n.translate or i18n.i18n

function index()
	if not nixio.fs.access("/etc/config/mydomain") then
		return
	end

	-- For modern LuCI with JavaScript view modules, we use 'call' type with a simple handler
	local page = entry({"admin", "services", "mydomain"}, call("action_index"), translate("MyDomain Manager"), 60)
	page.dependent = false
	page.acl_depends = { "luci-app-mydomain" }

	-- All sub-pages use the same handler, JavaScript modules will be loaded automatically
	entry({"admin", "services", "mydomain", "ddns"}, call("action_index"), translate("Dynamic DNS"), 10).leaf = true
	entry({"admin", "services", "mydomain", "proxy"}, call("action_index"), translate("Reverse Proxy"), 20).leaf = true
	entry({"admin", "services", "mydomain", "cert"}, call("action_index"), translate("Certificate Management"), 30).leaf = true
	entry({"admin", "services", "mydomain", "status"}, call("action_index"), translate("Status"), 40).leaf = true
end

function action_index()
	-- Render a basic template that will automatically load the JavaScript view module
	luci.template.render("mydomain/index")
end

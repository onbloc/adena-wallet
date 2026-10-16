Pod::Spec.new do |s|
  s.name         = "AdenaSecurity"
  s.version      = "0.0.1"
  s.summary      = "Screen privacy and protected storage for Adena Mobile"
  s.license      = "UNLICENSED"
  s.homepage     = "https://www.adena.app"
  s.author       = "Adena"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :path => "." }
  s.source_files = "*.{h,m,mm,swift}"
  s.swift_version = "5.0"

  install_modules_dependencies(s)
end

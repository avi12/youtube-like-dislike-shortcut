//! Unit tests.

use std::path::Path;

use crate::dev::hmr::analysis::wxt_resolution::*;

fn storage_import() -> AutoImport {
    AutoImport {
        name: "storage".to_owned(),
        source: "wxt/utils/storage".to_owned(),
        exported: "storage".to_owned(),
    }
}

#[test]
fn a_used_auto_import_is_added() {
    let code =
        source_with_auto_imports("await storage.getItem('a');", &[storage_import()]).unwrap();
    assert!(code.starts_with("import { storage as storage } from \"wxt/utils/storage\";\n"));
}

#[test]
fn declared_imported_and_member_uses_are_left_alone() {
    let imports = [storage_import()];
    for source in [
        "const storage = {};\nstorage.x();",
        "import { storage } from 'x';\nstorage.x();",
        "window.storage.x();",
        "const mystorage = 1;",
    ] {
        assert_eq!(source_with_auto_imports(source, &imports).unwrap(), source);
    }
}

#[test]
fn aliases_keep_declaration_order_and_resolve_against_the_wxt_directory() {
    let tsconfig: Tsconfig = serde_json::from_str(
        r##"{"compilerOptions":{"paths":{"#lib/*":["../src/lib/*"],"@":["../src"]}}}"##,
    )
    .unwrap();
    let aliases = aliases_of("C:/repo/.wxt", tsconfig);
    assert_eq!(
        aliases,
        [
            PathAlias {
                prefix: "#lib/".to_owned(),
                is_wildcard: true,
                target_base: "C:/repo/src/lib".to_owned()
            },
            PathAlias {
                prefix: "@".to_owned(),
                is_wildcard: false,
                target_base: "C:/repo/src".to_owned()
            },
        ]
    );
}

fn content_entry() -> Entrypoint {
    Entrypoint {
        name: "watcher".to_owned(),
        kind: EntryKind::ContentScript,
        source_path: "src/entrypoints/watcher.content.ts".to_owned(),
        built_file: "content-scripts/watcher.js".to_owned(),
    }
}

#[test]
fn content_scripts_get_a_wrapper_module() {
    let paths = ProjectPaths::new(Path::new("/repo"));
    let entry = content_entry();
    let modules = virtual_modules(&paths, Some(&entry));
    let input = entry_input(&paths, &entry);
    assert!(input.starts_with(&modules.content_entry_prefix));
    assert!(modules
        .modules
        .get(&input)
        .unwrap()
        .contains("new ContentScriptContext(\"watcher\""));
}

#!/usr/bin/env fish

set file_dir (dirname (status -f))
source $file_dir/utils.fish

function update_references
    # Function to update references to an (image) file in the content directory
    # Arguments:
    #  $1: Source file path, string. The source file must exist.
    #  $2: Target file path, string. 
    #   For example, if the target file path is test.com/test.jpg
    #    then the references to source will be updated to test.com/test.jpg.
    #  $3: Content directory, string. The directory where the content files are stored. 
    #   The content directory must exist. 
    # Returns:
    #  None
    # Side-effects:
    #  Updates references to the source file in $GIT_ROOT/content/**md files.
    set -l source_path $argv[1]
    set -l target_path $argv[2]
    set -g content_dir $argv[3]

    if test ! -d "$content_dir"
        echo "Error: Content directory '$content_dir' not found. Not updating references." >&2
        return 1
    end

    # Get original and new filenames
    set sanitized_source_path (sanitize_filename "$source_path")
    set sanitized_target_path (sanitize_filename "$target_path")

    perl_references $sanitized_source_path $sanitized_target_path $content_dir
end

function perl_references
    set -l original_pattern $argv[1]
    set -l replacement $argv[2]
    set -l content_directory $argv[3]
    set -l files_to_update (find $content_directory -iname "*.md" -type f)


    perl -i.bak -pe "s#$original_pattern#$replacement#g" $files_to_update
end

# Parse commandine flags
argparse 'source=' 'target=' 'run_script=' 'content_dir=?' -- $argv

if set -q $_flag_run_script
    if ! set -q _flag_content_dir
        set -g _flag_content_dir $GIT_ROOT/content
    end
    update_references $_flag_source $_flag_target $_flag_content_dir
end

set -l file_dir (dirname (status -f))
source $file_dir/../utils.fish

@test "r2_key truncates quartz/" (
    set -l result (get_r2_key 'quartz/file.txt')
    echo $result
) = 'file.txt'


@test "r2_key truncates leading slash" (
    set -l result (get_r2_key '/file.txt')
    echo $result
) = 'file.txt'

@test "r2_key leaves generic filepaths alone" (
    set -l result (get_r2_key 'secret-document-folder/files/text.doc')
    echo $result
) = 'secret-document-folder/files/text.doc'

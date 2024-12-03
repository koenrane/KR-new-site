set -l TEMP_DICT "/tmp/candidate_wordlist.txt"
set -l PERM_DICT ".wordlist.txt"
set -l SLUG_REGEX "(?=.{10,})[\da-zA-Z]+(\-[\da-zA-Z]+)+"
set -l FILES content/**.md # Respects gitignore by default

npx spellchecker --no-suggestions --quiet --dictionaries $PERM_DICT --generate-dictionary $TEMP_DICT --files $FILES --ignore $SLUG_REGEX &>/dev/null

# Check if spellchecker found errors
if test $status -ne 0
    # Open the temporary dictionary with Neovim and a notification
    nvim $TEMP_DICT -c 'lua vim.api.nvim_notify("Delete invalid words which should not be added to the dictionary.", vim.log.levels.INFO, {})'

    # Exit if temp dict is empty
    if not test -s $TEMP_DICT
        exit 1
    end

    # Append valid words to the permanent dictionary and remove the temporary one
    cat $TEMP_DICT >>$PERM_DICT
    trash-put $TEMP_DICT

    # Run spellcheck again with the updated dictionary
    npx spellchecker --files $FILES --no-suggestions --quiet --dictionaries $PERM_DICT --ignore $SLUG_REGEX; or exit

    # Amend the commit with the updated dictionary
    git add $PERM_DICT
    git commit --amend --no-edit -m "Add words to dictionary"
end

echo (set_color green) "Spellcheck passed" (set_color normal)

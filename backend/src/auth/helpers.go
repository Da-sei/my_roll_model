package auth

import (
	"encoding/json"
	"io"
)

// decodeJSON はio.ReaderからJSONをデコードする
func decodeJSON(r io.Reader, v interface{}) error {
	return json.NewDecoder(r).Decode(v)
}

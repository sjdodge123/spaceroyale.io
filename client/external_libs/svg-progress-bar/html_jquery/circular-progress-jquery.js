/*
 * @Author: Vinod Selvin
 * @Desc: Shows progress bar.
 * @Params: _upto -> upto that percentage.
 */
function __showProgress(_upto, _cir_progress_id) {

    //Filter Percentage
    _upto = (_upto > 100) ? 100 : ((_upto < 0) ? 0 : _upto);

    var _progress = 0;

    var _cir_progress = $("#"+_cir_progress_id).find("._cir_P_y");
    var _text_percentage = $("#"+_cir_progress_id).find("._cir_Per");

    var _input_percentage;
    var _percentage;

    var _sleep = setInterval(_animateCircle, 25);

    function _animateCircle() {

        _input_percentage = (_upto / 100) * 382;
        _percentage = (_progress / 100) * 382;

        _text_percentage.html(_progress + '%');

        if (_percentage >= _input_percentage) {

            clearInterval(_sleep);
        } else {

            _progress++;

            _cir_progress.attr("stroke-dasharray", _percentage + ',388');
        }
    }
}
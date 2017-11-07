/*
 * @Author: Manoj Selvin
 * @Desc: Shows progress bar.
 * @
 */
angular.module('myProgressBarApp', [])
        .controller('myCtrl', function ($scope, $interval) {

            $scope.percentage = "0%";

            $scope.__showProgress = function (_upto) {
                //Filter Percentage
                _upto = (_upto > 100) ? 100 : ((_upto < 0) ? 0 : _upto);

                var _progress = 0;

                var _cir_progress = angular.element(document.querySelector('#_cir_P_y'));
                var _text_percentage = angular.element(document.querySelector('#_cir_Per'));

                var _input_percentage;
                var _percentage;

                var _sleep = $interval(function () {
                    $scope._animateCircle();
                }, 25);

                $scope._animateCircle = function () {

                    _input_percentage = (_upto / 100) * 382;
                    _percentage = (_progress / 100) * 382;

                    if (_percentage >= _input_percentage) {

                        clearInterval(_sleep);
                    } else {

                        _progress++;

                        $scope.percentage = _progress + "%";

                        _cir_progress[0].style.strokeDasharray = _percentage + ', 1000';
                    }
                }
            };
        });